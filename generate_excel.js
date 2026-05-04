import ExcelJS from 'exceljs';

async function createExcel() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Workflow');

  // Add Headers
  sheet.addRow([
    'Step Number', 
    'Action', 
    'Field Type', 
    'Field Name', 
    'Value', 
    'Operator', 
    'True Step', 
    'Default Step'
  ]);

  // Add Data
  sheet.addRow([1, 'Start', '', '', '', '', '', '']);
  sheet.addRow([2, 'update', 'text', 'Incident Status', 'Investigating', '', '', '']);
  sheet.addRow([3, 'condition', 'text', 'Severity', 'High', 'Equals', 4, 5]);
  sheet.addRow([4, 'notification', 'notification', 'Alert Execs', '', '', '', '']);
  sheet.addRow([5, 'stop', '', '', '', '', '', '']);

  await workbook.xlsx.writeFile('example_workflow.xlsx');
  console.log('Successfully created example_workflow.xlsx!');
}

createExcel().catch(console.error);
