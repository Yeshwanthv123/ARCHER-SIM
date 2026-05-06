import ExcelJS from 'exceljs';

async function createComplexExcel() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Workflow');

  // Add Headers (10 columns)
  sheet.addRow([
    'Step Number', 
    'Action', 
    'Field Type', 
    'Field Name', 
    'Value', 
    'Date Option',
    'User Type',
    'Operator', 
    'True Step', 
    'Default Step'
  ]);

  // Style the header row to be bold
  sheet.getRow(1).font = { bold: true };

  // Add Data
  // Col: [Step, Action, FieldType, FieldName, Value, DateOpt, UserOpt, Operator, TrueStep, DefaultStep]
  sheet.addRow([1, 'Start', '', '', '', '', '', '', '', '']);
  
  // Update Text Field
  sheet.addRow([2, 'update', 'text', 'Incident Status', 'Investigating', '', '', '', '', '']);
  
  // Update Date (Current Date)
  sheet.addRow([3, 'update', 'date', 'Investigation Start Date', '', 'current', '', '', '', '']);
  
  // Update User/Group
  sheet.addRow([4, 'update', 'user', 'Assignee', 'Security Team Alpha', '', 'group', '', '', '']);
  
  // Notification Node
  sheet.addRow([5, 'notification', 'notification', 'Notify Responders', '', '', '', '', '', '']);
  
  // Condition Node (Severity Equals High) -> Branches to 7 (High) or 8 (Normal)
  sheet.addRow([6, 'condition', 'text', 'Severity', 'High', '', '', 'Equals', 7, 8]);
  
  // Step 7: Launch Event (High Priority Branch)
  sheet.addRow([7, 'launch', 'launch', 'Trigger High Priority Playbook', '', '', '', '', '', '']);
  
  // Step 8: Layout (Normal Priority Branch)
  sheet.addRow([8, 'layout', 'layout', 'Standard Investigation Layout', '', '', '', '', '', '']);
  
  // Step 9: User Action (Wait for user)
  sheet.addRow([9, 'useraction', 'useraction', 'Submit Investigation Findings', '', '', '', '', '', '']);
  
  // Step 10: Condition (Check if findings are valid) -> Branches to 11 (Valid) or 2 (Loop back to start investigating)
  sheet.addRow([10, 'condition', 'text', 'Findings Validated?', 'Yes', '', '', 'Equals', 11, 2]);
  
  // Step 11: Update Date (+14 days)
  sheet.addRow([11, 'update', 'date', 'Closure Deadline', '14', 'days', '', '', '', '']);
  
  // Step 12: Stop
  sheet.addRow([12, 'stop', '', '', '', '', '', '', '', '']);

  // Auto-adjust column widths
  sheet.columns.forEach(column => {
    column.width = 18;
  });

  await workbook.xlsx.writeFile('complex_workflow_template.xlsx');
  console.log('Successfully created complex_workflow_template.xlsx!');
}

createComplexExcel().catch(console.error);
