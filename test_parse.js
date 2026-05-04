import readXlsxFile from 'read-excel-file/node';

async function test() {
  try {
    const rows = await readXlsxFile('./example_workflow.xlsx');
    console.log("Parsed rows length:", rows.length);
    console.log("Parsed rows:", JSON.stringify(rows, null, 2));
  } catch(e) {
    console.error(e);
  }
}
test();
