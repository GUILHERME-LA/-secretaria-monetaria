"use client";

import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { CsvImporter } from "@/components/CsvImporter";

export default function ImportarPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--background)] pb-24">
      <Header />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pt-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="mb-1 text-xl font-bold text-[var(--foreground)]">
            Importar transações
          </h1>
          <p className="mb-6 text-sm text-[var(--muted-foreground)]">
            Importe o CSV exportado do Nubank para adicionar transações automaticamente
          </p>
          <CsvImporter />
        </motion.div>
      </main>
    </div>
  );
}
