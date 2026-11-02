import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createCleaningPreview } from '../services/cleaningService.js';
import { processSalesFile } from '../services/salesFileProcessor.js';

const createTempDir = (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'datamind-cleaning-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
};

test('preview retains original rows, requires review for missing values, and only handles explicit safe fixes', (t) => {
  const directory = createTempDir(t);
  const filePath = path.join(directory, 'sales.csv');
  fs.writeFileSync(filePath, [
    'Date,Product,Qty,Price,Total Sales,Category',
    '2026-10-05, Tea  Leaves ,2,5,10,',
    '2026-10-06,Tea,2,5,',
    '2026-10-07,,1,4,4,Drinks',
    '2026-10-08,Tea,2,5,8,Drinks',
  ].join('\n'));

  const processing = processSalesFile(filePath, 'csv');
  const preview = createCleaningPreview(processing, {
    removeDuplicates: true,
    handleMissingValues: true,
    normalizeProductNames: true,
  });

  assert.equal(preview.rowsBefore, 4);
  assert.equal(preview.summary.missingValues, 4);
  assert.equal(preview.summary.missingValuesHandled, 3);
  assert.equal(preview.summary.totalSalesMismatches, 1);
  assert.equal(preview.summary.invalidRecordCount, 2);
  assert.equal(preview.summary.cleanedRowCount, 2);
  assert.equal(preview.cleanedPreview[0].productName, 'Tea Leaves');
  assert.equal(preview.cleanedPreview[0].category, 'Uncategorized');
  assert.equal(preview.cleanedPreview[1].totalSales, 10);
  assert.equal(preview.originalPreview[0].values.Product, ' Tea  Leaves ');
  assert.equal(preview.reviewPreview.some((row) => row.rowNumber === 5), true);
});

test('allows an explicit derived total when the source has no total-sales column', (t) => {
  const directory = createTempDir(t);
  const filePath = path.join(directory, 'missing-total-column.csv');
  fs.writeFileSync(filePath, [
    'Date,Product,Qty,Price',
    '2026-10-12,Tea,3,4',
  ].join('\n'));

  const processing = processSalesFile(filePath, 'csv');
  const preview = createCleaningPreview(processing, { handleMissingValues: true });

  assert.equal(processing.missingFields.totalSales, 1);
  assert.equal(preview.summary.missingValuesHandled, 2);
  assert.equal(preview.cleanedPreview[0].totalSales, 12);
  assert.equal(preview.cleanedPreview[0].category, 'Uncategorized');
});

test('preserves product names when normalization is disabled', (t) => {
  const directory = createTempDir(t);
  const filePath = path.join(directory, 'product-name.csv');
  fs.writeFileSync(filePath, [
    'Date,Product,Qty,Price,Total Sales',
    '2026-10-12,  Tea  Leaves  ,3,4,12',
  ].join('\n'));

  const processing = processSalesFile(filePath, 'csv');
  const preview = createCleaningPreview(processing, {
    handleMissingValues: true,
    normalizeProductNames: false,
  });

  assert.equal(preview.cleanedPreview[0].productName, '  Tea  Leaves  ');
});
