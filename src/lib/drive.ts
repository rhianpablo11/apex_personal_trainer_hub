import { getAccessToken } from './auth';
import { Student, Payment } from '../types';

// Standard CSV parser that handles quotes and commas inside quotes
function parseCSV(csvText: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentVal = '';
  
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentVal);
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(currentVal);
      result.push(row);
      row = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  if (row.length > 0 || currentVal !== '') {
    row.push(currentVal);
    result.push(row);
  }
  return result;
}

function escapeCSVField(val: any): string {
  if (val === undefined || val === null) return '""';
  const str = String(val);
  const needsQuotes = str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r');
  const escaped = str.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function stringifyCSV(headers: string[], rows: Record<string, any>[]): string {
  const headerLine = headers.map(h => escapeCSVField(h)).join(',');
  const rowLines = rows.map(row => 
    headers.map(h => escapeCSVField(row[h])).join(',')
  );
  return [headerLine, ...rowLines].join('\n');
}

// Convert CSV content to Student objects
export function csvToStudents(csvText: string): Student[] {
  const headers = [
    'id', 'nome', 'email', 'senha', 'horario', 'vencimento_dia', 
    'data_contratacao', 'pago_este_mes', 'whatsapp', 'forma_pagamento', 
    'treino', 'ativo', 'data_hora_treino', 'valor_mensalidade'
  ];
  const rows = parseCSV(csvText);
  if (rows.length <= 1) return [];
  
  const fileHeaders = rows[0].map(h => h.trim().toLowerCase());
  const students: Student[] = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;
    
    const s: any = {};
    headers.forEach(h => {
      const idx = fileHeaders.indexOf(h.toLowerCase());
      if (idx !== -1 && idx < row.length) {
        const val = row[idx];
        if (h === 'vencimento_dia') {
          s[h] = parseInt(val) || 5;
        } else if (h === 'pago_este_mes') {
          s[h] = val === 'Sim' || val === 'true';
        } else if (h === 'ativo') {
          s[h] = val === 'Sim' || val === 'true' || val === ''; // default active if blank
        } else if (h === 'valor_mensalidade') {
          s[h] = parseFloat(val) || 0;
        } else {
          s[h] = val || '';
        }
      } else {
        if (h === 'vencimento_dia') s[h] = 5;
        else if (h === 'pago_este_mes') s[h] = false;
        else if (h === 'ativo') s[h] = true;
        else if (h === 'valor_mensalidade') s[h] = 0;
        else s[h] = '';
      }
    });
    students.push(s as Student);
  }
  return students;
}

// Convert Student objects to CSV content
export function studentsToCSV(students: Student[]): string {
  const headers = [
    'id', 'nome', 'email', 'senha', 'horario', 'vencimento_dia', 
    'data_contratacao', 'pago_este_mes', 'whatsapp', 'forma_pagamento', 
    'treino', 'ativo', 'data_hora_treino', 'valor_mensalidade'
  ];
  
  const mapped = students.map(s => ({
    ...s,
    pago_este_mes: s.pago_este_mes ? 'Sim' : 'Não',
    ativo: s.ativo ? 'Sim' : 'Não'
  }));
  
  return stringifyCSV(headers, mapped);
}

// Convert CSV content to Payment objects
export function csvToPayments(csvText: string): Payment[] {
  const headers = [
    'id', 'student_id', 'nome_aluno', 'mes_referencia', 
    'data_pagamento', 'valor', 'forma_pagamento', 'status'
  ];
  const rows = parseCSV(csvText);
  if (rows.length <= 1) return [];
  
  const fileHeaders = rows[0].map(h => h.trim().toLowerCase());
  const payments: Payment[] = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;
    
    const p: any = {};
    headers.forEach(h => {
      const idx = fileHeaders.indexOf(h.toLowerCase());
      if (idx !== -1 && idx < row.length) {
        const val = row[idx];
        if (h === 'valor') {
          p[h] = parseFloat(val) || 0;
        } else {
          p[h] = val || '';
        }
      } else {
        if (h === 'valor') p[h] = 0;
        else p[h] = '';
      }
    });
    payments.push(p as Payment);
  }
  return payments;
}

// Convert Payment objects to CSV content
export function paymentsToCSV(payments: Payment[]): string {
  const headers = [
    'id', 'student_id', 'nome_aluno', 'mes_referencia', 
    'data_pagamento', 'valor', 'forma_pagamento', 'status'
  ];
  return stringifyCSV(headers, payments);
}

// Google Drive API URL constants
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';

// 1. Search for a file or folder by name
async function searchFileOrFolder(name: string, parents?: string[], mimeType?: string): Promise<any | null> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google');
  
  let q = `name = '${name}' and trashed = false`;
  if (parents && parents.length > 0) {
    q += ` and '${parents[0]}' in parents`;
  }
  if (mimeType) {
    q += ` and mimeType = '${mimeType}'`;
  }
  
  const url = `${DRIVE_FILES_URL}?q=${encodeURIComponent(q)}&fields=files(id,name,modifiedTime)`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) {
    throw new Error(`Google Drive API search failed: ${res.statusText}`);
  }
  
  const data = await res.json();
  return data.files && data.files.length > 0 ? data.files[0] : null;
}

// 2. Create a folder in Google Drive
async function createFolder(name: string): Promise<string> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');
  
  const res = await fetch(DRIVE_FILES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder'
    })
  });
  
  if (!res.ok) {
    throw new Error(`Failed to create Google Drive folder: ${res.statusText}`);
  }
  
  const data = await res.json();
  return data.id;
}

// 3. Create an empty file with metadata in a parent folder
async function createEmptyFile(name: string, parentId: string): Promise<string> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');
  
  const res = await fetch(DRIVE_FILES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name,
      parents: [parentId]
    })
  });
  
  if (!res.ok) {
    throw new Error(`Failed to create file metadata: ${res.statusText}`);
  }
  
  const data = await res.json();
  return data.id;
}

// 4. Download file content from Google Drive
async function downloadFileContent(fileId: string): Promise<string> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');
  
  const res = await fetch(`${DRIVE_FILES_URL}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) {
    throw new Error(`Failed to download file content: ${res.statusText}`);
  }
  
  return await res.text();
}

// 5. Upload/overwrite file content in Google Drive
async function uploadFileContent(fileId: string, content: string): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');
  
  const res = await fetch(`${DRIVE_UPLOAD_URL}/${fileId}?uploadType=media`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'text/csv'
    },
    body: content
  });
  
  if (!res.ok) {
    throw new Error(`Failed to upload file content: ${res.statusText}`);
  }
}

// Get or Create the app's database folder
export async function getOrCreateAppFolder(): Promise<string> {
  const oldFolderName = 'Italo_Personal_App_DB';
  const newFolderName = 'Apex_Personal_App_DB';
  
  // First, check if the old folder exists to preserve data
  let existingFolder = await searchFileOrFolder(oldFolderName, undefined, 'application/vnd.google-apps.folder');
  if (existingFolder) {
    return existingFolder.id;
  }
  
  // Second, check if the new folder exists
  existingFolder = await searchFileOrFolder(newFolderName, undefined, 'application/vnd.google-apps.folder');
  if (existingFolder) {
    return existingFolder.id;
  }
  
  // Create the new folder if neither exists
  return await createFolder(newFolderName);
}

// Load both files (Students & Payments) from Google Drive
export async function loadDatabaseFromDrive(): Promise<{
  students: Student[];
  payments: Payment[];
  studentsFileId: string;
  paymentsFileId: string;
  studentsModifiedTime: string;
  paymentsModifiedTime: string;
}> {
  const folderId = await getOrCreateAppFolder();
  
  // 1. Load Students
  let studentsFile = await searchFileOrFolder('students.csv', [folderId]);
  let studentsFileId = '';
  let studentsModifiedTime = '';
  let studentsText = '';
  
  if (!studentsFile) {
    // Create new empty students.csv
    studentsFileId = await createEmptyFile('students.csv', folderId);
    studentsText = studentsToCSV([]);
    await uploadFileContent(studentsFileId, studentsText);
    studentsModifiedTime = new Date().toISOString();
  } else {
    studentsFileId = studentsFile.id;
    studentsModifiedTime = studentsFile.modifiedTime;
    studentsText = await downloadFileContent(studentsFileId);
  }
  
  // 2. Load Payments
  let paymentsFile = await searchFileOrFolder('payments.csv', [folderId]);
  let paymentsFileId = '';
  let paymentsModifiedTime = '';
  let paymentsText = '';
  
  if (!paymentsFile) {
    // Create new empty payments.csv
    paymentsFileId = await createEmptyFile('payments.csv', folderId);
    paymentsText = paymentsToCSV([]);
    await uploadFileContent(paymentsFileId, paymentsText);
    paymentsModifiedTime = new Date().toISOString();
  } else {
    paymentsFileId = paymentsFile.id;
    paymentsModifiedTime = paymentsFile.modifiedTime;
    paymentsText = await downloadFileContent(paymentsFileId);
  }
  
  return {
    students: csvToStudents(studentsText),
    payments: csvToPayments(paymentsText),
    studentsFileId,
    paymentsFileId,
    studentsModifiedTime,
    paymentsModifiedTime
  };
}

// Check remote modification times to spot conflicts
export async function checkRemoteModification(
  studentsFileId: string,
  paymentsFileId: string
): Promise<{
  studentsChanged: boolean;
  paymentsChanged: boolean;
  remoteStudentsModifiedTime: string;
  remotePaymentsModifiedTime: string;
  localStudentsModifiedTime: string;
  localPaymentsModifiedTime: string;
}> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');
  
  // Fetch remote files metadata to see current modifiedTime
  const fetchMetadata = async (fileId: string) => {
    const res = await fetch(`${DRIVE_FILES_URL}/${fileId}?fields=modifiedTime`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Failed to fetch file metadata: ${res.statusText}`);
    return await res.json();
  };
  
  const remoteStudents = await fetchMetadata(studentsFileId);
  const remotePayments = await fetchMetadata(paymentsFileId);
  
  return {
    studentsChanged: false, // We'll compare outside using stored timestamps
    paymentsChanged: false,
    remoteStudentsModifiedTime: remoteStudents.modifiedTime,
    remotePaymentsModifiedTime: remotePayments.modifiedTime,
    localStudentsModifiedTime: '', // Placeholders
    localPaymentsModifiedTime: ''
  };
}

// Overwrite Google Drive files with local state
export async function saveDatabaseToDrive(
  studentsFileId: string,
  paymentsFileId: string,
  students: Student[],
  payments: Payment[]
): Promise<{
  studentsModifiedTime: string;
  paymentsModifiedTime: string;
}> {
  const studentsCSV = studentsToCSV(students);
  const paymentsCSV = paymentsToCSV(payments);
  
  await uploadFileContent(studentsFileId, studentsCSV);
  await uploadFileContent(paymentsFileId, paymentsCSV);
  
  // Fetch updated modification times
  const token = await getAccessToken();
  const fetchMetadata = async (fileId: string) => {
    const res = await fetch(`${DRIVE_FILES_URL}/${fileId}?fields=modifiedTime`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    return data.modifiedTime;
  };
  
  const studentsModifiedTime = await fetchMetadata(studentsFileId);
  const paymentsModifiedTime = await fetchMetadata(paymentsFileId);
  
  return {
    studentsModifiedTime,
    paymentsModifiedTime
  };
}

// Download remote data directly for conflict comparison
export async function downloadRemoteData(
  studentsFileId: string,
  paymentsFileId: string
): Promise<{ students: Student[]; payments: Payment[] }> {
  const studentsText = await downloadFileContent(studentsFileId);
  const paymentsText = await downloadFileContent(paymentsFileId);
  
  return {
    students: csvToStudents(studentsText),
    payments: csvToPayments(paymentsText)
  };
}
