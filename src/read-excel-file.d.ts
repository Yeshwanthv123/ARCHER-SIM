declare module 'read-excel-file/browser' {
  export default function readXlsxFile(file: File | Blob): Promise<any[][]>;
}
