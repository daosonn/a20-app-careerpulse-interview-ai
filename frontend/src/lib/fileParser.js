import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export async function extractTextFromFile(file) {
  const extension = file.name.split('.').pop()?.toLowerCase();

  try {
    if (extension === 'pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(' ');
        fullText += pageText + '\n';
      }
      return fullText;
    } else if (extension === 'docx') {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } else if (extension === 'txt') {
      return await file.text();
    } else {
      throw new Error('Định dạng file không được hỗ trợ. Vui lòng chọn PDF, DOCX hoặc TXT.');
    }
  } catch (error) {
    console.error('Error parsing file:', error);
    throw new Error(error.message || 'Không thể đọc nội dung file. Vui lòng thử lại hoặc copy/paste text.');
  }
}
