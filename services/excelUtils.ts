import * as XLSX from 'xlsx';
import { Guest } from '../types';

export interface ExcelRow {
  [key: string]: any;
}

const COLUMN_KEYWORDS = {
  name: ['nome', 'guest', 'convidado', 'cliente', 'pesoa', 'name', 'full name'],
  cpf: ['cpf', 'doc', 'documento', 'identidade', 'id'],
  phone: ['telefone', 'celular', 'phone', 'whatsapp', 'contato', 'tel', 'zap']
};

function normalize(str: string): string {
  return str.toLowerCase().trim().replace(/[._-\s]/g, '');
}

function findBestColumn(headers: string[], keywords: string[]): string | undefined {
  const normalizedKeywords = keywords.map(normalize);
  
  // Direct match
  for (const header of headers) {
    const normHeader = normalize(header);
    if (normalizedKeywords.includes(normHeader)) return header;
  }

  // Partial match
  for (const header of headers) {
    const normHeader = normalize(header);
    if (normalizedKeywords.some(k => normHeader.includes(k) || k.includes(normHeader))) return header;
  }

  return undefined;
}

export const getExcelData = async (file: File): Promise<{ headers: string[], rows: ExcelRow[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];

        if (jsonData.length === 0) {
          resolve({ headers: [], rows: [] });
          return;
        }

        const headers = Object.keys(jsonData[0]);
        resolve({ headers, rows: jsonData });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

export const parseExcelGuestsWithMapping = (
  rows: ExcelRow[], 
  mapping: { name: string, cpf: string, phone: string }, 
  eventId: string
): Partial<Guest>[] => {
  return rows.map(row => {
    const id = crypto.randomUUID();
    return {
      id,
      eventId,
      name: mapping.name ? String(row[mapping.name] || '').trim() : '',
      cpf: mapping.cpf ? String(row[mapping.cpf] || '').trim() : '',
      phone: mapping.phone ? String(row[mapping.phone] || '').trim() : '',
      email: '',
      checkedIn: false,
      qrCodeData: JSON.stringify({
        eventId,
        guestId: id,
        valid: true
      })
    };
  }).filter(g => g.name || g.cpf || g.phone);
};

export const autoDetectColumns = (headers: string[]) => {
  return {
    name: findBestColumn(headers, COLUMN_KEYWORDS.name) || '',
    cpf: findBestColumn(headers, COLUMN_KEYWORDS.cpf) || '',
    phone: findBestColumn(headers, COLUMN_KEYWORDS.phone) || ''
  };
};

export const parseExcelGuests = async (file: File, eventId: string): Promise<Partial<Guest>[]> => {
  // Legacy support for backward compatibility if needed, but we'll use the new flow
  const { headers, rows } = await getExcelData(file);
  const mapping = autoDetectColumns(headers);
  return parseExcelGuestsWithMapping(rows, mapping, eventId);
};
