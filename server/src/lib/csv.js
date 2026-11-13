/**
 * Neutralises spreadsheet formula injection characters (=, +, -, @, \t, \r)
 * and escapes fields according to RFC 4180.
 *
 * @param {any} val Field value
 * @returns {string} Escaped CSV field
 */
export function escapeCsvField(val) {
  if (val === null || val === undefined) {
    return '';
  }
  let str = String(val);

  // Prevent spreadsheet formula injection:
  // If the field starts with =, +, -, @, \t, or \r, prefix with a single quote '
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // RFC 4180: If the string contains comma, double-quote, or newline,
  // enclose in double-quotes and escape double-quotes by doubling them.
  if (/[",\n\r]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Converts an array of field values into a single RFC 4180 comma-separated row.
 */
export function toCsvRow(fields) {
  return fields.map(escapeCsvField).join(',');
}

/**
 * Formats a list of rows into an RFC 4180 CSV string with CRLF line endings.
 */
export function formatCsv(rows, headers) {
  const lines = [];
  if (headers && headers.length > 0) {
    lines.push(toCsvRow(headers));
  }
  for (const r of rows) {
    lines.push(toCsvRow(r));
  }
  return lines.join('\r\n') + '\r\n';
}

