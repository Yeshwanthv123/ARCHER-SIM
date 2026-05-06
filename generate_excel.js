import ExcelJS from 'exceljs';

async function createComplexExcel() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Workflow');

  // Add Headers (11 columns)
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

  sheet.getRow(1).font = { bold: true };

  // Col: [Step, Action, Logic, FieldType, FieldName, Value, DateOpt, UserOpt, Operator, TrueStep, DefaultStep]
  sheet.addRow([1, 'Start', '', '', '', '', '', '', '', '', '']);
  
  // Step 2: Update Text
  sheet.addRow([2, 'update', '', 'text', 'Incident Status', 'Under Review', '', '', '', '', '']);
  
  // Step 3: Notification
  sheet.addRow([3, 'notification', '', 'notification', 'Alert SOC Team', '', '', '', '', '', '']);
  
  // Step 4: Condition Node with MULTIPLE branches AND Logic Chains
  
  // Branch 1: Priority = Critical AND Type = Security
  sheet.addRow([4, 'condition', 'AND', 'text', 'Priority', 'Critical', '', '', 'Equals', '', '']);
  sheet.addRow([4, 'condition', '', 'text', 'Type', 'Security', '', '', 'Equals', 5, '']);
  
  // Branch 2: Priority = High OR Priority = Medium
  sheet.addRow([4, 'condition', 'OR', 'text', 'Priority', 'High', '', '', 'Equals', '', '']);
  sheet.addRow([4, 'condition', '', 'text', 'Priority', 'Medium', '', '', 'Equals', 6, '']);
  
  // Branch 3: Priority = Low -> DEFAULT goes to 8
  sheet.addRow([4, 'condition', '', 'text', 'Priority', 'Low', '', '', 'Equals', 7, 8]);
  
  // Step 5: Critical/Security Path
  sheet.addRow([5, 'launch', '', 'launch', 'Trigger P1 Escalation Playbook', '', '', '', '', '', '']);
  
  // Step 6: High/Medium Path
  sheet.addRow([6, 'update', '', 'user', 'Assignee', 'Senior Analyst', '', 'group', '', '', '']);
  
  // Step 7: Low Path
  sheet.addRow([7, 'layout', '', 'layout', 'Standard Triage Layout', '', '', '', '', '', '']);
  
  // Step 8: Default Path
  sheet.addRow([8, 'useraction', '', 'useraction', 'Automated Triage Wait', '', '', '', '', '', '']);
  
  // Step 9: Stop
  sheet.addRow([9, 'stop', '', '', '', '', '', '', '', '', '']);

  sheet.columns.forEach(column => {
    column.width = 18;
  });

  await workbook.xlsx.writeFile('logic_chain_workflow.xlsx');
  console.log('Successfully created logic_chain_workflow.xlsx!');
}

createComplexExcel().catch(console.error);
