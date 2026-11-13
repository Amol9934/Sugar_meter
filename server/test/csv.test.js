import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeCsvField, toCsvRow, formatCsv } from '../src/lib/csv.js';

describe('CSV escaping and formula injection protection', () => {
  test('handles null, undefined and standard strings without escaping', () => {
    assert.equal(escapeCsvField(null), '');
    assert.equal(escapeCsvField(undefined), '');
    assert.equal(escapeCsvField(''), '');
    assert.equal(escapeCsvField('After lunch'), 'After lunch');
    assert.equal(escapeCsvField(120), '120');
  });

  test('escapes fields containing commas, double quotes, and newlines per RFC 4180', () => {
    assert.equal(escapeCsvField('Morning, fasting'), '"Morning, fasting"');
    assert.equal(escapeCsvField('Value with "quotes"'), '"Value with ""quotes"""');
    assert.equal(escapeCsvField("Line 1\nLine 2"), '"Line 1\nLine 2"');
    assert.equal(escapeCsvField("Line 1\r\nLine 2"), '"Line 1\r\nLine 2"');
  });

  test('neutralises values starting with =, +, -, @ to prevent formula injection', () => {
    assert.equal(escapeCsvField('=SUM(A1:A10)'), "'=SUM(A1:A10)");
    assert.equal(escapeCsvField('+123'), "'+123");
    assert.equal(escapeCsvField('-45'), "'-45");
    assert.equal(escapeCsvField('@cmd'), "'@cmd");
    assert.equal(escapeCsvField('\tcmd'), "'\tcmd");

    // When formula character AND special character (like comma or quote) are both present
    assert.equal(escapeCsvField('=cmd|"/c calc"!A0'), '"\'=cmd|""/c calc""!A0"');
  });

  test('toCsvRow joins fields with commas', () => {
    assert.equal(
      toCsvRow(['2026-11-12', 'After lunch', 135]),
      '2026-11-12,After lunch,135'
    );
    assert.equal(
      toCsvRow(['2026-11-12', 'Morning, fasting', '=1+1']),
      '2026-11-12,"Morning, fasting",\'=1+1'
    );
  });

  test('formatCsv formats header and data rows with CRLF endings', () => {
    const headers = ['date', 'slot', 'value'];
    const rows = [
      ['2026-11-12', 'After lunch', 135],
      ['2026-11-12', 'After dinner', 150],
    ];
    const csv = formatCsv(rows, headers);
    assert.equal(
      csv,
      'date,slot,value\r\n2026-11-12,After lunch,135\r\n2026-11-12,After dinner,150\r\n'
    );
  });
});

