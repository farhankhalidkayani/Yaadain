import jsPDF from "jspdf";
import "jspdf-autotable";
import autoTable from "jspdf-autotable";

// Define types for our memory book and memories
interface Memory {
  id: string;
  title: string;
  text: string;
  imageUrl?: string;
  audioUrl?: string;
  createdAt: Date | { toDate(): Date };
}

interface Book {
  id: string;
  title: string;
  description?: string;
  coverUrl?: string;
  status: "in-progress" | "complete";
  createdAt: Date | { toDate(): Date };
}

// Helper function to format dates
const formatDate = (dateValue: any): string => {
  try {
    if (dateValue instanceof Date) {
      return dateValue.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }

    if (dateValue && typeof dateValue.toDate === "function") {
      return dateValue.toDate().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }

    if (typeof dateValue === "string") {
      return new Date(dateValue).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }

    return new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch (e) {
    console.error("Error formatting date:", e);
    return "Unknown date";
  }
};

// Function to generate a PDF from memory book data
export const generateBookPDF = async (
  book: Book,
  memories: Memory[]
): Promise<void> => {
  // Create new PDF document
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Add metadata
  pdf.setProperties({
    title: book.title,
    subject: "Memory Book",
    author: "Yaadain App",
    keywords: "memories, stories",
    creator: "Yaadain App",
  });

  // Add title page
  pdf.setFontSize(24);
  pdf.setFont("helvetica", "bold");
  pdf.text(book.title, pdf.internal.pageSize.getWidth() / 2, 40, {
    align: "center",
  });

  pdf.setFontSize(16);
  pdf.setFont("helvetica", "italic");
  pdf.text("Memory Book", pdf.internal.pageSize.getWidth() / 2, 50, {
    align: "center",
  });

  if (book.description) {
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");

    // Split long description into lines
    const descriptionLines = pdf.splitTextToSize(
      book.description,
      pdf.internal.pageSize.getWidth() - 40
    );

    pdf.text(descriptionLines, pdf.internal.pageSize.getWidth() / 2, 70, {
      align: "center",
    });
  }

  // Add book creation date
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(
    `Created: ${formatDate(book.createdAt)}`,
    pdf.internal.pageSize.getWidth() / 2,
    pdf.internal.pageSize.getHeight() - 20,
    { align: "center" }
  );

  // Add cover image if available
  if (book.coverUrl) {
    try {
      // Fetch image
      const response = await fetch(book.coverUrl);
      const imgData = await response.blob();
      const imgUrl = URL.createObjectURL(imgData);

      // Insert image
      const imgWidth = 100;
      const imgHeight = 120;
      const imgX = (pdf.internal.pageSize.getWidth() - imgWidth) / 2;

      pdf.addImage(imgUrl, "JPEG", imgX, 80, imgWidth, imgHeight);

      // Clean up object URL
      URL.revokeObjectURL(imgUrl);
    } catch (error) {
      console.error("Failed to load cover image:", error);
    }
  }

  // Add table of contents page if there are enough memories
  if (memories.length > 3) {
    pdf.addPage();
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("Table of Contents", 20, 20);

    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");

    memories.forEach((memory, index) => {
      pdf.text(`${index + 1}. ${memory.title}`, 20, 30 + index * 10);
    });
  }

  // Add memories
  memories.forEach((memory, index) => {
    // Add a new page for each memory
    pdf.addPage();

    // Memory title
    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.text(memory.title, 20, 20);

    // Memory creation date
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "italic");
    pdf.text(formatDate(memory.createdAt), 20, 30);

    // Memory text
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");

    // Split memory text into paragraphs by newlines
    const paragraphs = memory.text.split("\n").filter((p) => p.trim() !== "");

    let yPos = 40;

    paragraphs.forEach((paragraph) => {
      // Split paragraph into lines that fit on page
      const lines = pdf.splitTextToSize(
        paragraph,
        pdf.internal.pageSize.getWidth() - 40
      );

      // Check if we need a new page for this paragraph
      if (yPos + lines.length * 7 > pdf.internal.pageSize.getHeight() - 20) {
        pdf.addPage();
        yPos = 20;
      }

      // Add the paragraph lines
      pdf.text(lines, 20, yPos);

      // Update y position for next paragraph, adding extra space between paragraphs
      yPos += lines.length * 7 + 5;
    });

    // Add memory image if available
    if (memory.imageUrl) {
      try {
        (async () => {
          // Check if we need a new page for the image
          if (yPos + 100 > pdf.internal.pageSize.getHeight() - 20) {
            pdf.addPage();
            yPos = 20;
          }

          // Fetch image
          const response = await fetch(memory.imageUrl);
          const imgData = await response.blob();
          const imgUrl = URL.createObjectURL(imgData);

          // Insert image
          const imgWidth = 150;
          const imgHeight = 100;

          pdf.addImage(imgUrl, "JPEG", 20, yPos, imgWidth, imgHeight);

          // Clean up object URL
          URL.revokeObjectURL(imgUrl);
        })().catch((err) => {
          console.error("Failed to load memory image:", err);
        });
      } catch (error) {
        console.error("Failed to load memory image:", error);
      }
    }

    // Add footer with page number
    pdf.setFontSize(8);
    pdf.text(
      `Page ${pdf.internal.getNumberOfPages()}`,
      pdf.internal.pageSize.getWidth() - 20,
      pdf.internal.pageSize.getHeight() - 10,
      { align: "right" }
    );
  });

  // Generate filename based on book title
  const filename = `${book.title
    .replace(/\s+/g, "_")
    .toLowerCase()}_memory_book.pdf`;

  // Save the PDF
  pdf.save(filename);
};
