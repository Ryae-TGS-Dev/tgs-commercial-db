const { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  Table, 
  TableRow, 
  TableCell, 
  AlignmentType, 
  HeadingLevel, 
  WidthType, 
  BorderStyle, 
  ShadingType,
  PageNumber,
  LevelFormat,
  Footer,
  TableOfContents
} = require('docx');
const fs = require('fs');

async function createManual() {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Arial", size: 24 } // 12pt
        }
      },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 36, bold: true, color: "1e293b" },
          paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 }
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 28, bold: true, color: "334155" },
          paragraph: { spacing: { before: 300, after: 150 }, outlineLevel: 1 }
        }
      ]
    },
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [{
            level: 0,
            format: LevelFormat.BULLET,
            text: "•",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } }
          }]
        }
      ]
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 }, // US Letter
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun("TGS Commercial Database — User Manual | Page "),
                new TextRun({ children: [PageNumber.CURRENT] })
              ]
            })
          ]
        })
      },
      children: [
        // Title Page
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "TGS Commercial Database & Analytics", bold: true, size: 52 }),
            new TextRun({ text: "\n", break: 1 }),
            new TextRun({ text: "Official User Manual", size: 32, color: "64748b" }),
            new TextRun({ text: "\n", break: 4 }),
            new TextRun({ text: "Prepared for TGS Commercial Team", size: 24 }),
            new TextRun({ text: "\n", break: 1 }),
            new TextRun({ text: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), size: 24 }),
            new TextRun({ text: "\n", break: 6 }),
          ]
        }),

        new Paragraph({ children: [new TextRun({ text: "", break: 1, pageBreakBefore: true })] }),

        // Table of Contents
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Table of Contents")] }),
        new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-3" }),
        
        new Paragraph({ children: [new TextRun({ text: "", break: 1, pageBreakBefore: true })] }),

        // Section 1: Introduction
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("1. Introduction")] }),
        new Paragraph({
          children: [
            new TextRun("The TGS Commercial Database is a high-precision financial intelligence platform. It tracks portfolio profitability, streamlines field data entry, and ensures data integrity across all commercial service records.")
          ]
        }),

        // Section 2: Core Modules
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("2. Core Modules & Features")] }),
        
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.1 Portfolio Analytics")] }),
        new Paragraph({ children: [new TextRun("Your central dashboard for business health:")] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Net Profit & Efficiency: View real-time earnings vs. overhead costs.")] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Yield Leaderboard: Rank communities by profit margin (red flags indicate needed renegotiations).")] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Operational Burn: Visualization of labor and material 'overhead' for any date range.")] }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.2 Record Service (Field Log)")] }),
        new Paragraph({ children: [new TextRun("The primary tool for recording daily work:")] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Intelligent Search: Quickly find communities by name or management company.")] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Labor Auto-Calculation: Enter clock time; the system handles the dollar math.")] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Material Tracking: Search products to add usage; costs are calculated automatically.")] }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.3 Data Governance & Portfolio Management")] }),
        new Paragraph({ children: [new TextRun("Tools to keep your data clean:")] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Community Merger: Combine duplicate property records while preserving history.")] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Crew Normalization: Standardize team names without breaking past logs.")] }),

        // Section 3: Access Control Table
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("3. Role-Based Access Privileges")] }),
        new Paragraph({ children: [new TextRun("The system assigns access automatically based on your authenticated profile.")] }),
        
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [4000, 2680, 2680],
          rows: [
            new TableRow({
              children: [
                new TableCell({ shading: { fill: "f1f5f9", type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Feature", bold: true })] })] }),
                new TableCell({ shading: { fill: "f1f5f9", type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Admin", bold: true })] })] }),
                new TableCell({ shading: { fill: "f1f5f9", type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Executive", bold: true })] })] }),
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("View Analytics & Reports")] }),
                new TableCell({ children: [new Paragraph("Full Access")] }),
                new TableCell({ children: [new Paragraph("Full Access")] }),
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("Record Service Logs")] }),
                new TableCell({ children: [new Paragraph("Authorized")] }),
                new TableCell({ children: [new Paragraph("Read Only")] }),
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("Manage Pricing & Mergers")] }),
                new TableCell({ children: [new Paragraph("Authorized")] }),
                new TableCell({ children: [new Paragraph("Restricted")] }),
              ]
            })
          ]
        }),

        // Section 4: Best Practices
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("4. Operational Best Practices")] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Title Case: Use standard Title Case for consistency in community names.")] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Material Units: Always use uppercase for units (e.g., BAG, GAL, PLT).")] }),
        new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Sync Frequency: If using offline, refresh data once per day for accuracy.")] })
      ]
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync("TGS_Commercial_Database_User_Manual.docx", buffer);
  console.log("Document created successfully.");
}

createManual().catch(console.error);
