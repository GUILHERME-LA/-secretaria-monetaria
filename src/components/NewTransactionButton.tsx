"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";
import { TransactionForm } from "./TransactionForm";

type Props = {
  onDone?: () => void;
  currentMonth?: string;
};

export function NewTransactionButton({ onDone, currentMonth }: Props) {
  const [open, setOpen] = useState(false);

  function handleDone() {
    setOpen(false);
    onDone?.();
  }

  return (
    <>
      <Button id="tour-nova-transacao" onClick={() => setOpen(true)}>
        <Plus size={18} />
        Nova Transação
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nova Transação">
        <TransactionForm onDone={handleDone} currentMonth={currentMonth} />
      </Modal>
    </>
  );
}
