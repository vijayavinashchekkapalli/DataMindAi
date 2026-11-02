const defaultOptions = {
  removeDuplicates: true,
  handleMissingValues: false,
  normalizeProductNames: true,
};

const roundCurrency = (value) => Number(value.toFixed(2));

export const normalizeCleaningOptions = (options = {}) => ({
  removeDuplicates: typeof options.removeDuplicates === 'boolean' ? options.removeDuplicates : defaultOptions.removeDuplicates,
  handleMissingValues: typeof options.handleMissingValues === 'boolean' ? options.handleMissingValues : defaultOptions.handleMissingValues,
  normalizeProductNames: typeof options.normalizeProductNames === 'boolean' ? options.normalizeProductNames : defaultOptions.normalizeProductNames,
});

export const createCleaningPreview = (processing, requestedOptions = {}) => {
  const options = normalizeCleaningOptions(requestedOptions);
  let missingValuesHandled = 0;
  let correctedRecords = 0;
  let removedDuplicateCount = 0;

  const reviewedRecords = processing.records.map((record) => {
    const normalized = { ...record.normalized };
    const issues = [...record.issues];
    let corrected = false;
    const removeIssue = (code) => {
      const index = issues.findIndex((issue) => issue.code === code);
      if (index !== -1) issues.splice(index, 1);
    };

    if (options.normalizeProductNames && normalized.productName) {
      const name = normalized.productName.replace(/\s+/g, ' ').trim();
      if (name !== normalized.productName) {
        normalized.productName = name;
        corrected = true;
      }
    }

    if (record.dateWasNormalized) corrected = true;

    if (options.handleMissingValues) {
      if (!normalized.category) {
        normalized.category = 'Uncategorized';
        missingValuesHandled += 1;
        corrected = true;
        removeIssue('missingCategory');
      }

      if (normalized.totalSales === null && normalized.quantitySold > 0
        && normalized.unitPrice !== null && normalized.unitPrice >= 0) {
        normalized.totalSales = roundCurrency(normalized.quantitySold * normalized.unitPrice);
        missingValuesHandled += 1;
        corrected = true;
        removeIssue('missingTotalSales');
      }
    }

    if (record.duplicate && options.removeDuplicates) {
      removedDuplicateCount += 1;
    }

    const remainingIssues = issues.filter((issue) => issue.code !== 'duplicate');
    const importable = !record.empty
      && remainingIssues.length === 0
      && !(record.duplicate && options.removeDuplicates);
    if (corrected) correctedRecords += 1;

    return {
      rowNumber: record.rowNumber,
      values: record.values,
      normalized,
      empty: record.empty,
      duplicate: record.duplicate,
      importable,
      originalIssues: record.issues,
      issues: remainingIssues,
    };
  });

  const importableRecords = reviewedRecords.filter((record) => record.importable);
  const invalidRecords = reviewedRecords.filter((record) => (
    !record.empty && !record.importable && record.issues.length > 0
  )).length;
  const issueCounts = processing.issueCounts;
  const qualitySummary = [
    { key: 'missingValues', label: 'Missing values', count: issueCounts.missingValues },
    { key: 'invalidDates', label: 'Invalid dates', count: issueCounts.invalidDates },
    { key: 'negativeQuantities', label: 'Negative quantities', count: issueCounts.negativeQuantities },
    { key: 'negativePrices', label: 'Negative prices', count: issueCounts.negativePrices },
    { key: 'invalidQuantities', label: 'Invalid quantities', count: issueCounts.invalidQuantities },
    { key: 'invalidPrices', label: 'Invalid prices', count: issueCounts.invalidPrices },
    { key: 'totalSalesMismatches', label: 'Total sales mismatches', count: issueCounts.totalSalesMismatches },
    { key: 'invalidPurchaseCosts', label: 'Invalid purchase costs', count: issueCounts.invalidPurchaseCosts },
    { key: 'duplicateRows', label: 'Exact duplicate records', count: issueCounts.duplicateRows },
    { key: 'emptyRows', label: 'Empty rows', count: issueCounts.emptyRows },
    ...Object.entries(processing.missingFields).map(([field, count]) => ({
      key: `missing-${field}`,
      label: `Missing ${field.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)}`,
      count,
    })),
  ];

  return {
    options,
    summary: {
      originalRowCount: processing.totalRows,
      validRecordCount: importableRecords.length,
      invalidRecordCount: invalidRecords,
      duplicateRecordCount: issueCounts.duplicateRows,
      removedDuplicateCount,
      missingValues: issueCounts.missingValues,
      missingValuesHandled,
      invalidDates: issueCounts.invalidDates,
      negativeQuantities: issueCounts.negativeQuantities,
      negativePrices: issueCounts.negativePrices,
      invalidQuantities: issueCounts.invalidQuantities,
      invalidPrices: issueCounts.invalidPrices,
      invalidTotalSales: issueCounts.invalidTotalSales,
      invalidPurchaseCosts: issueCounts.invalidPurchaseCosts,
      totalSalesMismatches: issueCounts.totalSalesMismatches,
      emptyRows: issueCounts.emptyRows,
      correctedRecords,
      cleanedRowCount: importableRecords.length,
      recordsAffected: invalidRecords + removedDuplicateCount + correctedRecords,
      missingFields: processing.missingFields,
      qualitySummary,
    },
    rowsBefore: processing.totalRows,
    rowsAfter: importableRecords.length,
    rows: importableRecords.map((record) => ({
      ...record.normalized,
      category: record.normalized.category || 'General',
    })),
    originalPreview: reviewedRecords.slice(0, 20).map(({ rowNumber, values, empty, duplicate, originalIssues }) => ({
      rowNumber,
      values,
      empty,
      duplicate,
      issues: originalIssues,
    })),
    cleanedPreview: importableRecords.slice(0, 20).map(({ rowNumber, normalized }) => ({
      rowNumber,
      ...normalized,
      category: normalized.category || 'General',
    })),
    reviewPreview: reviewedRecords
      .filter((record) => !record.importable)
      .slice(0, 50)
      .map(({ rowNumber, values, duplicate, originalIssues }) => ({
        rowNumber,
        values,
        duplicate,
        issues: originalIssues,
      })),
  };
};

export const getCleaningOperationLabels = (options) => [
  options.removeDuplicates ? 'Remove exact duplicate rows' : 'Keep exact duplicate rows',
  options.handleMissingValues ? 'Fill missing category and derivable total sales' : 'Flag missing values for review',
  options.normalizeProductNames ? 'Normalize product names' : 'Preserve product names',
  'Validate dates, quantities, prices, and total sales',
];
