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

export const parseExcelGuests = async (file: File, eventId: string): Promise<Partial<Guest>[]> => {
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
          resolve([]);
          return;
        }

        const headers = Object.keys(jsonData[0]);
        const nameCol = findBestColumn(headers, COLUMN_KEYWORDS.name);
        const cpfCol = findBestColumn(headers, COLUMN_KEYWORDS.cpf);
        const phoneCol = findBestColumn(headers, COLUMN_KEYWORDS.phone);

        const guests: Partial<Guest>[] = jsonData.map(row => ({
          id: crypto.randomUUID(),
          eventId,
          name: nameCol ? String(row[nameCol]) : '',
          cpf: cpfCol ? String(row[cpfCol]) : '',
          phone: phoneCol ? String(row[phoneCol]) : '',
          email: '',
          checkedIn: false
        })).filter(g => g.name || g.cpf || g.phone);

        resolve(guests);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};
