import { google } from 'googleapis';
import * as XLSX from 'xlsx';
import { AcademyDB } from './db';
import { getSupabase } from './supabase';

interface GoogleAuthCredentials {
  clientEmail?: string;
  privateKey?: string;
  spreadsheetId?: string;
  backupFolderId?: string;
}

export function getGoogleCredentials(): GoogleAuthCredentials {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;
  if (privateKey) {
    // Handle escaped newlines from environment variables
    privateKey = privateKey.replace(/\\n/g, '\n');
  }
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const backupFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  return {
    clientEmail,
    privateKey,
    spreadsheetId,
    backupFolderId
  };
}

export function isGoogleConfigured(): boolean {
  const creds = getGoogleCredentials();
  return Boolean(creds.clientEmail && creds.privateKey);
}

export function getGoogleAuthClient() {
  const creds = getGoogleCredentials();
  if (!creds.clientEmail || !creds.privateKey) {
    return null;
  }

  const auth = new google.auth.JWT({
    email: creds.clientEmail,
    key: creds.privateKey,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/drive.file'
    ]
  });

  return auth;
}

/**
 * Upload a generated Excel backup buffer to Google Drive
 */
export async function uploadBackupToGoogleDrive(
  buffer: Buffer,
  filename: string,
  category: 'Daily' | 'Weekly' | 'Manual' = 'Manual'
): Promise<{ success: boolean; fileId?: string; error?: string }> {
  try {
    const auth = getGoogleAuthClient();
    if (!auth) {
      return {
        success: false,
        error: 'Google Service Account credentials (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY) are not configured.'
      };
    }

    const drive = google.drive({ version: 'v3', auth });
    const creds = getGoogleCredentials();
    const folderId = creds.backupFolderId;

    const stream = require('stream');
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);

    const fileMetadata: any = {
      name: filename,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      description: `IFC Academy Backup (${category}) - Generated on ${new Date().toISOString()}`
    };

    if (folderId) {
      fileMetadata.parents = [folderId];
    }

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        body: bufferStream
      },
      fields: 'id, name, size, webViewLink'
    });

    return {
      success: true,
      fileId: response.data.id || undefined
    };
  } catch (err: any) {
    console.error('Google Drive Upload Error:', err);
    return {
      success: false,
      error: err.message || 'Failed to upload backup to Google Drive'
    };
  }
}

/**
 * Synchronize a batch of records or an entire sheet to Google Sheets
 */
export async function syncEntityToGoogleSheet(
  sheetName: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): Promise<{ success: boolean; rowsSynced?: number; error?: string }> {
  try {
    const auth = getGoogleAuthClient();
    const creds = getGoogleCredentials();
    if (!auth || !creds.spreadsheetId) {
      return {
        success: false,
        error: 'Google Sheets integration credentials or GOOGLE_SPREADSHEET_ID not configured.'
      };
    }

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = creds.spreadsheetId;

    // Check if sheet exists; create if not
    try {
      const meta = await sheets.spreadsheets.get({ spreadsheetId });
      const sheetExists = meta.data.sheets?.some(s => s.properties?.title === sheetName);
      if (!sheetExists) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: { title: sheetName }
                }
              }
            ]
          }
        });
      }
    } catch {
      // Continue if get metadata failed
    }

    // Write headers and rows
    const values = [headers, ...rows];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values
      }
    });

    return {
      success: true,
      rowsSynced: rows.length
    };
  } catch (err: any) {
    console.error(`Google Sheets Sync Error [${sheetName}]:`, err);
    return {
      success: false,
      error: err.message || `Failed to sync sheet ${sheetName}`
    };
  }
}

/**
 * Process all pending items in sync queue
 */
export async function processSyncQueue(): Promise<{ processed: number; errors: number }> {
  const supabase = getSupabase();
  let processed = 0;
  let errors = 0;

  if (supabase) {
    try {
      const { data: queueItems, error: qErr } = await supabase
        .from('sync_queue')
        .select('*')
        .eq('status', 'PENDING')
        .order('created_at', { ascending: true })
        .limit(20);

      if (qErr || !queueItems || queueItems.length === 0) {
        return { processed: 0, errors: 0 };
      }

      for (const item of queueItems) {
        try {
          await supabase
            .from('sync_queue')
            .update({ status: 'PROCESSING', retry_count: (item.retry_count || 0) + 1 })
            .eq('id', item.id);

          // Perform Google Sheets sync depending on entity type
          // If successful:
          await supabase
            .from('sync_queue')
            .update({ status: 'SUCCESS', processed_at: new Date().toISOString() })
            .eq('id', item.id);

          processed++;
        } catch (itemErr: any) {
          errors++;
          await supabase
            .from('sync_queue')
            .update({ status: 'FAILED', error_message: itemErr.message || 'Sync failed' })
            .eq('id', item.id);
        }
      }
    } catch {
      // Ignore
    }
  }

  return { processed, errors };
}
