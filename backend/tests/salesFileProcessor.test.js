import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import XLSX from 'xlsx';
import { getFileType, processSalesFile } from '../services/salesFileProcessor.js';

const createTempDir = (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'datamind-upload-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
};

test('parses aliases, validates invalid quantities, and reports duplicate CSV rows', (t) => {
  const directory = createTempDir(t);
  const filePath = path.join(directory, 'sales.csv');
  fs.writeFileSync(filePath, [
    'Date,Product,Qty,Price,Revenue,Category,Purchase Cost',
    '2026-10-30,Tea,2,5,10,Grocery,3',
    '2026-10-30,Rice,-1,20,20,Grocery,12',
    '2026-10-30,Tea,2,5,10,Grocery,3',
  ].join('\n'));

  const result = processSalesFile(filePath, 'csv');
  assert.equal(result.totalRows, 3);
  assert.equal(result.validRows.length, 1);
  assert.equal(result.invalidRows.filter((row) => !row.duplicate).length, 1);
  assert.equal(result.duplicateRows, 1);
  assert.equal(result.validRows[0].productName, 'Tea');
});

test('rejects CSV files missing required columns with a useful message', (t) => {
  const directory = createTempDir(t);
  const filePath = path.join(directory, 'missing.csv');
  fs.writeFileSync(filePath, 'Date,Product\n2026-10-30,Tea');

  assert.throws(() => processSalesFile(filePath, 'csv'), /Missing required columns: Quantity Sold, Unit Price/);
});

test('rejects empty and malformed CSV files', (t) => {
  const directory = createTempDir(t);
  const emptyPath = path.join(directory, 'empty.csv');
  fs.writeFileSync(emptyPath, '');
  assert.throws(() => processSalesFile(emptyPath, 'csv'), /file is empty/);

  const malformedPath = path.join(directory, 'malformed.csv');
  fs.writeFileSync(malformedPath, 'Date,Product,Qty,Price,Revenue\n"2026-10-30,Tea,2,5,10');
  assert.throws(() => processSalesFile(malformedPath, 'csv'), /Could not parse CSV/);
});

test('parses XLSX workbooks and normalizes required columns', (t) => {
  const directory = createTempDir(t);
  const filePath = path.join(directory, 'sales.xlsx');
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet([
    { Date: '2026-10-30', 'Product Name': 'Coffee', 'Quantity Sold': 3, 'Unit Price': 4, 'Total Sales': 12 },
  ]);
  XLSX.utils.book_append_sheet(workbook, sheet, 'Sales');
  XLSX.writeFile(workbook, filePath);

  const result = processSalesFile(filePath, 'xlsx');
  assert.equal(result.totalRows, 1);
  assert.equal(result.validRows.length, 1);
  assert.equal(result.validRows[0].totalSales, 12);
});

test('recognizes only supported upload extensions', () => {
  assert.equal(getFileType('sales.csv'), 'csv');
  assert.equal(getFileType('sales.xls'), 'xls');
  assert.equal(getFileType('sales.xlsx'), 'xlsx');
  assert.equal(getFileType('sales.pdf'), null);
});

test('preserves dirty source rows and identifies cleaning issues without discarding them', (t) => {
  const directory = createTempDir(t);
  const filePath = path.join(directory, 'dirty-sales.csv');
  fs.writeFileSync(filePath, [
    'Date,Product,Qty,Price,Total Sales,Category',
    '2026-10-05,Tea,2,5,10,Drinks',
    '2026-10-05,Tea,2,5,10,Drinks',
    '2026-10-06,,1,5,5,Drinks',
    ',Coffee,1,3,3,Drinks',
    '2026-10-07,Milk,,2,,Dairy',
    '2026-10-07,Bread,2,,4,Bakery',
    'not-a-date,Juice,1,4,4,Drinks',
    '2026-10-08,Negative quantity,-1,5,-5,Drinks',
    '2026-10-09,Negative price,2,-2,-4,Drinks',
    '2026-10-10,Wrong total,2,5,8,Drinks',
    '',
    '2026-10-11,Snack,1,1,1,',
  ].join('\n'));

  const result = processSalesFile(filePath, 'csv');

  assert.equal(result.totalRows, 12);
  assert.equal(result.records.length, 12);
  assert.equal(result.issueCounts.emptyRows, 1);
  assert.equal(result.issueCounts.duplicateRows, 1);
  assert.equal(result.issueCounts.invalidDates, 1);
  assert.equal(result.issueCounts.negativeQuantities, 1);
  assert.equal(result.issueCounts.negativePrices, 1);
  assert.equal(result.issueCounts.invalidPrices, 1);
  assert.equal(result.issueCounts.totalSalesMismatches, 1);
  assert.equal(result.missingFields.productName, 1);
  assert.equal(result.missingFields.date, 1);
  assert.equal(result.missingFields.quantitySold, 1);
  assert.equal(result.missingFields.unitPrice, 1);
  assert.equal(result.missingFields.totalSales, 1);
  assert.equal(result.missingFields.category, 1);
  assert.equal(result.records.some((record) => record.empty), true);
  assert.equal(result.records[1].duplicate, true);
});

test('normalizes supported day-first and unambiguous month-first dates in UTC', (t) => {
  const directory = createTempDir(t);
  const filePath = path.join(directory, 'date-formats.csv');
  fs.writeFileSync(filePath, [
    'Date,Product,Qty,Price,Total Sales',
    '13/10/2026,Tea,1,5,5',
    '10/14/2026,Coffee,1,4,4',
    '01/02/2026,Ambiguous,1,3,3',
  ].join('\n'));

  const result = processSalesFile(filePath, 'csv');
  assert.equal(result.validRows.length, 2);
  assert.equal(result.records[0].normalized.date.toISOString(), '2026-10-13T00:00:00.000Z');
  assert.equal(result.records[1].normalized.date.toISOString(), '2026-10-14T00:00:00.000Z');
  assert.equal(result.issueCounts.invalidDates, 1);
});
