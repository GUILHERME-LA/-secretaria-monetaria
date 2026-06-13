"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, LayoutDashboard, ChevronDown, ChevronUp } from "lucide-react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/Card";

const STORAGE_KEY = "secretaria_tutorial_visto";

const faq = [
  {
    titulo: "📊 Dashboard",
    conteudo: (
      <ul className="flex list-inside flex-col gap-2 text-sm text-[var(--muted-foreground)]">
        <li><strong className="text-[var(--foreground)]">Cards:</strong> Mostram Recebido, Gasto e Saldo do mês. Se houver valores previstos, aparecem abaixo em cinza.</li>
        <li><strong className="text-[var(--foreground)]">Seletor de meses:</strong> Navegue entre meses com dados. Meses passados sem transações ficam ocultos.</li>
        <li><strong className="text-[var(--foreground)]">Toggle "Mostrar previstos":</strong> Quando ativo, valores futuros (pendentes) aparecem nos cards, gráficos e ranking.</li>
      </ul>
    ),
  },
  {
    titulo: "➕ Adicionar Transação",
    conteudo: (
      <ul className="flex list-inside flex-col gap-2 text-sm text-[var(--muted-foreground)]">
        <li>Clique em <strong className="text-[var(--foreground)]">"Nova Transação"</strong> no topo da dashboard.</li>
        <li>Escolha <strong className="text-[var(--foreground)]">Receita</strong> (dinheiro que entra) ou <strong className="text-[var(--foreground)]">Despesa</strong> (dinheiro que sai).</li>
        <li>Selecione a <strong className="text-[var(--foreground)]">categoria</strong>, preencha descrição, valor e data.</li>
        <li>Se a data for em um mês <strong className="text-[var(--foreground)]">futuro</strong>, a transação será salva como <strong className="text-yellow-500">"Previsto"</strong>.</li>
        <li>Para <strong className="text-[var(--foreground)]">editar</strong>, clique no ícone ✏️ ao lado da transação.</li>
        <li>Para <strong className="text-[var(--foreground)]">excluir</strong>, clique no ícone 🗑️.</li>
      </ul>
    ),
  },
  {
    titulo: "⏳ Transações Previstas",
    conteudo: (
      <ul className="flex list-inside flex-col gap-2 text-sm text-[var(--muted-foreground)]">
        <li>São transações com data futura ou criadas automaticamente por contas recorrentes.</li>
        <li>Aparecem na lista com <strong className="text-[var(--foreground)]">borda tracejada</strong> e badge <span className="rounded bg-yellow-500/10 px-1.5 py-0.5 text-[10px] text-yellow-500 font-medium">Previsto</span>.</li>
        <li>Quando você pagar/receber o valor, clique no <strong className="text-green-500">✓</strong> verde para confirmar.</li>
        <li>Após confirmada, a transação vira <strong className="text-[var(--foreground)]">"Realizada"</strong> e entra nos totais reais.</li>
      </ul>
    ),
  },
  {
    titulo: "🔄 Contas Recorrentes",
    conteudo: (
      <ul className="flex list-inside flex-col gap-2 text-sm text-[var(--muted-foreground)]">
        <li>Acesse pelo ícone <strong className="text-[var(--foreground)]">🔄</strong> no Header ou pela página <strong className="text-[var(--foreground)]">/recorrentes</strong>.</li>
        <li>Clique em <strong className="text-[var(--foreground)]">"Nova"</strong> para criar: defina tipo, categoria, descrição, valor e dia de vencimento.</li>
        <li>Ao entrar na dashboard do mês atual, o sistema <strong className="text-[var(--foreground)]">auto-cria</strong> as contas ativas como "Previsto".</li>
        <li>Use o toggle <strong className="text-[var(--foreground)]">ativar/desativar</strong> para pular um mês sem excluir a recorrência.</li>
      </ul>
    ),
  },
  {
    titulo: "📈 Gráficos",
    conteudo: (
      <ul className="flex list-inside flex-col gap-2 text-sm text-[var(--muted-foreground)]">
        <li><strong className="text-[var(--foreground)]">Gastos por Categoria (Pizza):</strong> Distribuição dos gastos do mês selecionado.</li>
        <li><strong className="text-[var(--foreground)]">Top Categorias (Ranking):</strong> As 5 categorias com maior gasto, ordenadas.</li>
        <li><strong className="text-[var(--foreground)]">Comparativo Mensal:</strong> Evolução dos últimos 6 meses. Barras sólidas = realizado, barras transparentes = previsto.</li>
        <li>Use o toggle <strong className="text-[var(--foreground)]">"Mostrar previstos"</strong> para incluir ou remover valores futuros dos gráficos.</li>
      </ul>
    ),
  },
  {
    titulo: "🤖 Chat IA",
    conteudo: (
      <ul className="flex list-inside flex-col gap-2 text-sm text-[var(--muted-foreground)]">
        <li>Clique no botão <strong className="text-[var(--foreground)]">💬</strong> no canto inferior direito para abrir o chat.</li>
        <li>Descreva a transação do seu jeito: <em className="text-[var(--foreground)]">"comprei um sorvete de 10 reais"</em>, <em className="text-[var(--foreground)]">"recebi 3000 de salário"</em>.</li>
        <li>A IA tenta entender: tipo, valor, categoria, descrição e data.</li>
        <li>Revise o que ela entendeu e clique em <strong className="text-[var(--foreground)]">"Adicionar"</strong> para salvar.</li>
        <li>Se a data for futura, a transação será salva como <strong className="text-yellow-500">"Previsto"</strong>.</li>
      </ul>
    ),
  },
  {
    titulo: "⚙️ Configurações",
    conteudo: (
      <ul className="flex list-inside flex-col gap-2 text-sm text-[var(--muted-foreground)]">
        <li>Acesse pelo ícone <strong className="text-[var(--foreground)]">⚙️</strong> no Header.</li>
        <li><strong className="text-[var(--foreground)]">Alterar email:</strong> Digite o novo email e clique em "Alterar email". Um link de confirmação será enviado.</li>
        <li><strong className="text-[var(--foreground)]">Alterar senha:</strong> Informe a senha atual, a nova senha e confirme. A senha deve ter no mínimo 6 caracteres.</li>
      </ul>
    ),
  },
];

export default function AjudaPage() {
  const router = useRouter();
  const [aberto, setAberto] = useState<number | null>(0);

  function resetarTutorial() {
    localStorage.removeItem(STORAGE_KEY);
    router.push("/dashboard");
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            <ArrowLeft size={16} /> Voltar
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            <LayoutDashboard size={16} /> Início
          </button>
        </div>

        <h1 className="mb-2 text-2xl font-bold text-[var(--foreground)]">Ajuda</h1>
        <p className="mb-8 text-sm text-[var(--muted-foreground)]">
          Tire suas dúvidas sobre como usar a Secretaria Monetária.
        </p>

        <div className="flex flex-col gap-2">
          {faq.map((item, idx) => (
            <Card key={idx} className="p-0">
              <button
                onClick={() => setAberto(aberto === idx ? null : idx)}
                className="flex w-full cursor-pointer items-center justify-between px-4 py-3.5 text-left"
              >
                <span className="text-sm font-semibold text-[var(--foreground)]">
                  {item.titulo}
                </span>
                {aberto === idx ? (
                  <ChevronUp size={18} className="shrink-0 text-[var(--muted-foreground)]" />
                ) : (
                  <ChevronDown size={18} className="shrink-0 text-[var(--muted-foreground)]" />
                )}
              </button>
              {aberto === idx && (
                <div className="border-t border-[var(--border)] px-4 py-3">
                  {item.conteudo}
                </div>
              )}
            </Card>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-dashed border-[var(--border)] p-6 text-center">
          <p className="mb-2 text-sm text-[var(--muted-foreground)]">
            Quer ver o tutorial de boas-vindas novamente?
          </p>
          <button
            onClick={resetarTutorial}
            className="cursor-pointer rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            Ver tutorial novamente
          </button>
        </div>
      </main>
    </>
  );
}
