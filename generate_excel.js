import ExcelJS from 'exceljs';

async function createExcel() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Workflow');

  // Add Headers
  sheet.addRow([
    'Step Number', 
    'Action', 
    'Logic (AND/OR)',
    'Field Type', 
    'Field Name', 
    'Value', 
    'Date Option',
    'User Type',
    'Operator', 
    'True Step', 
    'Default Step'
  ]);

  const rows = [
    [1, 'Start', '', '', '', '', '', '', '', '', ''],
    [2, 'condition', '', 'text', 'cond1', 'comment', '', '', 'Contains', 3, ''],
    [2, 'condition', '', 'text', 'cond2', 'comment2', '', '', 'Contains', 13, ''],
    [2, 'condition', '', 'text', 'con3', 'comment3', '', '', 'Contains', 18, ''],
    [3, 'update', '', 'text', 'test', 'sendnoti', '', '', '', '', ''],
    [4, 'notification', '', '', 'notifi', '', '', '', '', '', ''],
    [5, 'unknown', '', '', '', '', '', '', '', '', ''],
    [6, 'launch', '', '', 'launch', '', '', '', '', '', ''],
    [7, 'condition', '', 'text', 'one', 'dsdsds', '', '', 'Contains', 8, ''],
    [7, 'condition', '', 'Type', 'Field', 'Value', '', '', 'Operator', 9, ''],
    [8, 'update', '', 'text', 'ds', 'ds', '', '', '', '', ''],
    [9, 'wait', '', '', 'waiting', '', '', '', '', '', ''],
    [10, 'unknown', '', '', '', '', '', '', '', '', ''],
    [11, 'notification', '', '', 'send', '', '', '', '', '', ''],
    [12, 'stop', '', '', '', '', '', '', '', '', ''],
    [13, 'update', '', 'text', 'text1', 'test', '', '', '', '', ''],
    [14, 'layout', '', '', 'layout', '', '', '', '', '', ''],
    [15, 'update', '', 'text', 'res', 'comment', '', '', '', '', '']
  ];

  rows.forEach(r => sheet.addRow(r));

  sheet.getRow(1).font = { bold: true };
  sheet.columns.forEach(column => {
    column.width = 15;
  });

  await workbook.xlsx.writeFile('d:/archer simulator engine/ARCHER-SIM/workflow.xlsx');
  console.log('Done!');
}

createExcel();
