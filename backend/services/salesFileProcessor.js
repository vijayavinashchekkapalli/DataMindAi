import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import { parse as parseCsv } from 'csv-parse/sync';

const normalizeHeader = (value = '') => String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, '');

const aliases = {
  date: ['date', 'transactiondate', 'saledate', 'orderdate', 'createdat'],
  productName: ['productname', 'product', 'item', 'name'],
  quantitySold: ['quantitysold', 'qty', 'quantity', 'units', 'items'],
  unitPrice: ['unitprice', 'price', 'unitcost'],
  totalSales: ['totalsales', 'totalrevenue', 'revenue', 'total', 'sales'],
  category: ['category', 'department', 'productcategory'],
  purchaseCost: ['purchasecost', 'cost', 'costprice'],
};

const requiredFields = ['date', 'productName', 'quantitySold', 'unitPrice'];
const trackedFields = [...requiredFields, 'totalSales', 'category'];

const getMappedHeaders = (headers) => {
  const normalizedHeaders = headers.map((header) => [normalizeHeader(header), header]);
  return Object.fromEntries(Object.entries(aliases).map(([field, names]) => [
    field,
    normalizedHeaders.find(([normalized]) => names.includes(normalized))?.[1] || null,
  ]));
};

const createUtcDate = (year, month, day) => {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date
    : null;
};

const parseDate = (value) => {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    const date = createUtcDate(parsed.y, parsed.m, parsed.d);
    if (!date) return null;
    date.setUTCHours(parsed.H, parsed.M, Math.floor(parsed.S), 0);
    return date;
  }
  if (typeof value !== 'string' || !value.trim()) return null;

  const input = value.trim();
  const iso = input.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (iso) return createUtcDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const dayMonth = input.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dayMonth) {
    const first = Number(dayMonth[1]);
    const second = Number(dayMonth[2]);
    const year = Number(dayMonth[3]);
    if (first > 12 && second <= 12) return createUtcDate(year, second, first);
    if (second > 12 && first <= 12) return createUtcDate(year, first, second);
    if (first === second && first <= 12) return createUtcDate(year, first, second);
    return null;
  }

  const serial = Number(input);
  if (Number.isInteger(serial) && serial >= 20000 && serial <= 80000) {
    return new Date(Date.UTC(1899, 11, 30) + serial * 24 * 60 * 60 * 1000);
  }

  if (!/[a-z]/i.test(input) && !input.includes('T')) return null;
  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parseNumber = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || !value.trim()) return null;
  const normalized = value.trim().replace(/[$₹£€,\s]/g, '');
  if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const readRows = (filePath, fileType) => {
  if (fileType === 'csv') {
    const content = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
    return parseCsv(content, {
      bom: true,
      columns: true,
      skip_empty_lines: false,
      trim: false,
      relax_column_count: true,
    });
  }

  const workbook = XLSX.readFile(filePath, { cellDates: true, raw: false });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) return [];
  return XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: '', raw: false });
};

const isEmptyValue = (value) => value === undefined || value === null || String(value).trim() === '';

const getExactSignature = (source, headers) => JSON.stringify(headers.map((header) => source[header] ?? ''));

export const processSalesFile = (filePath, fileType) => {
  if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
    const error = new Error('The selected file is empty. Choose a file containing sales data.');
    error.statusCode = 400;
    throw error;
  }

  let rows;
  try {
    rows = readRows(filePath, fileType);
  } catch (cause) {
    const error = new Error(fileType === 'csv' ? `Could not parse CSV: ${cause.message}` : 'Could not read the Excel file. Check that it is a valid XLS or XLSX workbook.');
    error.statusCode = 400;
    error.cause = cause;
    throw error;
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    const error = new Error('The file contains a header but no sales rows.');
    error.statusCode = 400;
    throw error;
  }

  const headers = Object.keys(rows[0] || {});
  const mappedHeaders = getMappedHeaders(headers);
  const missingColumns = requiredFields.filter((field) => !mappedHeaders[field]);
  if (missingColumns.length) {
    const labelByField = { date: 'Date', productName: 'Product Name', quantitySold: 'Quantity Sold', unitPrice: 'Unit Price', totalSales: 'Total Sales' };
    const error = new Error(`Missing required columns: ${missingColumns.map((field) => labelByField[field]).join(', ')}. Accepted alternatives include Product, Item, Qty, Price, Revenue and Sales.`);
    error.statusCode = 400;
    error.details = { missingColumns: missingColumns.map((field) => labelByField[field]), availableColumns: headers };
    throw error;
  }

  const seen = new Set();
  const records = [];
  const missingFields = Object.fromEntries(trackedFields.map((field) => [field, 0]));
  const issueCounts = {
    missingValues: 0,
    invalidDates: 0,
    negativeQuantities: 0,
    negativePrices: 0,
    invalidQuantities: 0,
    invalidPrices: 0,
    invalidTotalSales: 0,
    invalidPurchaseCosts: 0,
    totalSalesMismatches: 0,
    duplicateRows: 0,
    emptyRows: 0,
  };

  rows.forEach((source, index) => {
    const value = (field) => mappedHeaders[field] ? source[mappedHeaders[field]] : '';
    const empty = headers.every((header) => isEmptyValue(source[header]));
    const dateValue = value('date');
    const date = parseDate(dateValue);
    const productValue = value('productName');
    const productName = String(productValue ?? '');
    const quantityValue = value('quantitySold');
    const quantitySold = parseNumber(quantityValue);
    const priceValue = value('unitPrice');
    const unitPrice = parseNumber(priceValue);
    const totalValue = value('totalSales');
    const totalSales = parseNumber(totalValue);
    const purchaseCostValue = mappedHeaders.purchaseCost ? value('purchaseCost') : '';
    const purchaseCost = isEmptyValue(purchaseCostValue) ? null : parseNumber(purchaseCostValue);
    const categoryValue = value('category');
    const category = String(categoryValue ?? '').trim();
    const issues = [];

    const addIssue = (code, message) => issues.push({ code, message });
    const markMissing = (field, message) => {
      missingFields[field] += 1;
      issueCounts.missingValues += 1;
      addIssue(`missing${field[0].toUpperCase()}${field.slice(1)}`, message);
    };

    if (empty) {
      issueCounts.emptyRows += 1;
      addIssue('emptyRow', 'Empty row');
    } else {
      if (isEmptyValue(dateValue)) markMissing('date', 'Date is missing');
      else if (!date) {
        issueCounts.invalidDates += 1;
        addIssue('invalidDate', 'Date cannot be parsed');
      }

      if (isEmptyValue(productValue)) markMissing('productName', 'Product name is missing');
      if (isEmptyValue(quantityValue)) markMissing('quantitySold', 'Quantity is missing');
      else if (quantitySold === null) {
        issueCounts.invalidQuantities += 1;
        addIssue('invalidQuantity', 'Quantity must be a number');
      } else if (quantitySold <= 0) {
        if (quantitySold < 0) issueCounts.negativeQuantities += 1;
        issueCounts.invalidQuantities += 1;
        addIssue('invalidQuantity', quantitySold < 0 ? 'Quantity cannot be negative' : 'Quantity must be greater than zero');
      }

      if (isEmptyValue(priceValue)) markMissing('unitPrice', 'Unit price is missing');
      else if (unitPrice === null) {
        issueCounts.invalidPrices += 1;
        addIssue('invalidPrice', 'Unit price must be a number');
      } else if (unitPrice < 0) {
        issueCounts.negativePrices += 1;
        issueCounts.invalidPrices += 1;
        addIssue('invalidPrice', 'Unit price cannot be negative');
      }

      if (isEmptyValue(totalValue)) markMissing('totalSales', 'Total sales is missing');
      else if (totalSales === null || totalSales < 0) {
        issueCounts.invalidTotalSales += 1;
        addIssue('invalidTotalSales', totalSales === null ? 'Total sales must be a number' : 'Total sales cannot be negative');
      } else if (quantitySold !== null && quantitySold > 0 && unitPrice !== null && unitPrice >= 0
        && Math.abs(totalSales - quantitySold * unitPrice) > 0.01) {
        issueCounts.totalSalesMismatches += 1;
        addIssue('totalSalesMismatch', 'Total sales does not equal quantity multiplied by unit price');
      }

      if (isEmptyValue(categoryValue)) {
        markMissing('category', 'Category is missing');
      }

      if (!isEmptyValue(purchaseCostValue) && (purchaseCost === null || purchaseCost < 0)) {
        issueCounts.invalidPurchaseCosts += 1;
        addIssue('invalidPurchaseCost', purchaseCost === null ? 'Purchase cost must be a number' : 'Purchase cost cannot be negative');
      }
    }

    const duplicateSignature = empty ? null : getExactSignature(source, headers);
    const duplicate = duplicateSignature !== null && seen.has(duplicateSignature);
    if (duplicate) {
      issueCounts.duplicateRows += 1;
      addIssue('duplicate', 'Exact duplicate row');
    } else if (duplicateSignature !== null) {
      seen.add(duplicateSignature);
    }

    records.push({
      rowNumber: index + 2,
      values: source,
      empty,
      duplicate,
      dateWasNormalized: typeof dateValue === 'string' && !!date && dateValue.trim() !== date.toISOString().slice(0, 10),
      normalized: {
        date,
        productName,
        category: category || null,
        quantitySold,
        unitPrice,
        totalSales,
        purchaseCost,
      },
      issues,
    });
  });

  const validRows = records
    .filter((record) => (
      !record.empty
      && !record.issues.some((issue) => issue.code !== 'missingCategory')
    ))
    .map((record) => ({
      ...record.normalized,
      productName: record.normalized.productName.trim(),
      category: record.normalized.category || 'General',
    }));
  const invalidRows = records
    .filter((record) => record.issues.length > 0)
    .map((record) => ({
      row: record.rowNumber,
      errors: record.issues.map((issue) => issue.message),
      values: record.values,
      duplicate: record.duplicate,
      empty: record.empty,
    }));

  return {
    totalRows: rows.length,
    headers,
    records,
    validRows,
    invalidRows,
    duplicateRows: issueCounts.duplicateRows,
    missingFields,
    issueCounts,
    preview: rows.slice(0, 10),
    validationErrors: invalidRows.slice(0, 50),
  };
};

export const getFileType = (originalName = '') => {
  const extension = path.extname(originalName).toLowerCase();
  if (extension === '.csv') return 'csv';
  if (extension === '.xls') return 'xls';
  if (extension === '.xlsx') return 'xlsx';
  return null;
};

export const getRowSignature = (row) => [new Date(row.date).toISOString(), String(row.productName).trim().toLowerCase(), Number(row.quantitySold), Number(row.unitPrice), Number(row.totalSales)].join('|');
