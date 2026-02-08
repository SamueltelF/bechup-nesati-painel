import PDFDocument from 'pdfkit';
import axios from 'axios';

/**
 * Gerar PDF com dados da verificação do vendedor
 */
export const generateVerificationPDF = async (verificationRecord) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ===== HEADER =====
      doc.fontSize(20).font('Helvetica-Bold')
         .text('RELATÓRIO DE VERIFICAÇÃO DE VENDEDOR', { align: 'center' });
      
      doc.fontSize(10).font('Helvetica')
         .text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, { align: 'center' });
      
      doc.moveDown(2);

      // ===== STATUS =====
      const statusColors = {
        pending: '#FFA500',
        under_review: '#0000FF',
        approved: '#00FF00',
        rejected: '#FF0000'
      };
      
      doc.fontSize(12).font('Helvetica-Bold').text('STATUS DA VERIFICAÇÃO', { underline: true });
      doc.fontSize(10).font('Helvetica')
         .fillColor(statusColors[verificationRecord.verificationStatus] || '#000000')
         .text(`Status: ${verificationRecord.verificationStatus.toUpperCase()}`)
         .fillColor('#000000');
      doc.moveDown();

      // ===== DADOS PESSOAIS =====
      doc.fontSize(12).font('Helvetica-Bold').text('DADOS PESSOAIS', { underline: true });
      doc.fontSize(10).font('Helvetica');
      
      const data = verificationRecord.submittedData;
      
      doc.text(`Nome Completo: ${data.fullName || 'N/A'}`);
      doc.text(`CPF: ${formatCPF(data.cpf) || 'N/A'}`);
      doc.text(`Data de Nascimento: ${formatDate(data.dateOfBirth) || 'N/A'}`);
      doc.text(`Idade: ${calculateAge(data.dateOfBirth)} anos`);
      doc.moveDown();

      // ===== DADOS DO USUÁRIO =====
      if (verificationRecord.userId) {
        doc.fontSize(12).font('Helvetica-Bold').text('DADOS DE CONTA', { underline: true });
        doc.fontSize(10).font('Helvetica');
        doc.text(`Email: ${verificationRecord.userId.email || 'N/A'}`);
        doc.text(`Telefone: ${verificationRecord.userId.phone || 'N/A'}`);
        doc.text(`Conta Criada em: ${formatDate(verificationRecord.userId.createdAt)}`);
        doc.moveDown();
      }

      // ===== DADOS BANCÁRIOS =====
      if (data.bankDetails && Object.keys(data.bankDetails).length > 0) {
        doc.fontSize(12).font('Helvetica-Bold').text('DADOS BANCÁRIOS', { underline: true });
        doc.fontSize(10).font('Helvetica');
        doc.text(`Banco: ${data.bankDetails.bankName || 'N/A'}`);
        doc.text(`Tipo de Conta: ${data.bankDetails.accountType || 'N/A'}`);
        doc.text(`Agência: ${data.bankDetails.agency || 'N/A'}`);
        doc.text(`Conta: ${data.bankDetails.accountNumber || 'N/A'}`);
        doc.text(`Chave PIX: ${data.bankDetails.pixKey || 'N/A'}`);
        doc.moveDown();
      }

      // ===== HISTÓRICO =====
      doc.fontSize(12).font('Helvetica-Bold').text('HISTÓRICO DA SOLICITAÇÃO', { underline: true });
      doc.fontSize(10).font('Helvetica');
      doc.text(`Data de Submissão: ${formatDate(verificationRecord.submittedAt)}`);
      doc.text(`IP de Origem: ${verificationRecord.ipAddress || 'N/A'}`);
      
      if (verificationRecord.decision?.madeBy) {
        doc.text(`Analisado por: ${verificationRecord.decision.madeBy}`);
        doc.text(`Data da Decisão: ${formatDate(verificationRecord.decision.madeAt)}`);
        if (verificationRecord.decision.reason) {
          doc.text(`Motivo: ${verificationRecord.decision.reason}`);
        }
      }
      doc.moveDown();

      // ===== FOTOS DOS DOCUMENTOS =====
      doc.addPage();
      doc.fontSize(14).font('Helvetica-Bold').text('DOCUMENTOS ANEXADOS', { align: 'center' });
      doc.moveDown();

      let yPosition = doc.y;

      // Foto Pessoal
      if (data.personalPhoto) {
        try {
          const personalImg = await downloadImage(data.personalPhoto);
          doc.fontSize(10).font('Helvetica-Bold').text('Foto Pessoal:', 50, yPosition);
          doc.image(personalImg, 50, yPosition + 20, { width: 200 });
          yPosition += 220;
        } catch (err) {
          console.error('Erro ao carregar foto pessoal:', err);
        }
      }

      // RG Frente
      if (data.rgFrontPhoto) {
        try {
          const rgFrontImg = await downloadImage(data.rgFrontPhoto);
          doc.fontSize(10).font('Helvetica-Bold').text('RG - Frente:', 50, yPosition);
          doc.image(rgFrontImg, 50, yPosition + 20, { width: 250 });
          yPosition += 200;
        } catch (err) {
          console.error('Erro ao carregar RG frente:', err);
        }
      }

      // RG Verso (nova página se necessário)
      if (data.rgBackPhoto) {
        if (yPosition > 600) {
          doc.addPage();
          yPosition = 50;
        }
        try {
          const rgBackImg = await downloadImage(data.rgBackPhoto);
          doc.fontSize(10).font('Helvetica-Bold').text('RG - Verso:', 50, yPosition);
          doc.image(rgBackImg, 50, yPosition + 20, { width: 250 });
        } catch (err) {
          console.error('Erro ao carregar RG verso:', err);
        }
      }

      // ===== WATERMARK DE SEGURANÇA =====
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 1; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(60)
           .fillColor('#000000', 0.05)
           .rotate(-45, { origin: [300, 400] })
           .text('CONFIDENCIAL', 200, 400, { align: 'center' })
           .rotate(45, { origin: [300, 400] })
           .fillColor('#000000', 1);
      }

      doc.end();

    } catch (error) {
      reject(error);
    }
  });
};

// ===== FUNÇÕES AUXILIARES =====

function formatCPF(cpf) {
  if (!cpf) return '';
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatDate(date) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('pt-BR');
}

function calculateAge(birthDate) {
  if (!birthDate) return 'N/A';
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

async function downloadImage(url) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data, 'binary');
  } catch (error) {
    console.error('Erro ao baixar imagem:', error);
    throw error;
  }
}