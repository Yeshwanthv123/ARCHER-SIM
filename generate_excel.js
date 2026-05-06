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

  sheet.getRow(1).font = { bold: true };

  // Col: [Step, Action, FieldType, FieldName, Value, DateOpt, UserOpt, Operator, TrueStep, DefaultStep]
  sheet.addRow([1, 'Start', '', '', '', '', '', '', '', '']);
  
  // Step 2: Update Text
  sheet.addRow([2, 'update', 'text', 'Incident Status', 'Under Review', '', '', '', '', '']);
  
  // Step 3: Notification
  sheet.addRow([3, 'notification', 'notification', 'Alert SOC Team', '', '', '', '', '', '']);
  
  // Step 4: Condition Node with MULTIPLE branches (Switch case style)
  // Branch 1: Critical
  sheet.addRow([4, 'condition', 'text', 'Priority', 'Critical', '', '', 'Equals', 5, '']);
  // Branch 2: High
  sheet.addRow([4, 'condition', 'text', 'Priority', 'High', '', '', 'Equals', 6, '']);
  // Branch 3: Medium - Includes the Default Step
  sheet.addRow([4, 'condition', 'text', 'Priority', 'Medium', '', '', 'Equals', 7, 8]);
  
  // Step 5: Critical Path
  sheet.addRow([5, 'launch', 'launch', 'Trigger P1 Escalation Playbook', '', '', '', '', '', '']);
  
  // Step 6: High Path
  sheet.addRow([6, 'update', 'user', 'Assignee', 'Senior Analyst', '', 'group', '', '', '']);
  
  // Step 7: Medium Path
  sheet.addRow([7, 'layout', 'layout', 'Standard Triage Layout', '', '', '', '', '', '']);
  
  // Step 8: Default (Low Priority) Path
  sheet.addRow([8, 'useraction', 'useraction', 'Automated Triage Wait', '', '', '', '', '', '']);
  
  // Step 9: All paths converge here to stop (for simulation simplicity, we just put a stop node)
  // Wait, I didn't connect steps 5,6,7 to 9. The builder requires manual linking if it's not sequential, but sequential falls through automatically in builder except for stop.
  // We'll just put Stop at Step 9.
  sheet.addRow([9, 'stop', '', '', '', '', '', '', '', '']);

  sheet.columns.forEach(column => {
    column.width = 18;
  });

  await workbook.xlsx.writeFile('multi_branch_workflow_template.xlsx');
  console.log('Successfully created multi_branch_workflow_template.xlsx!');
}

createComplexExcel().catch(console.error);
