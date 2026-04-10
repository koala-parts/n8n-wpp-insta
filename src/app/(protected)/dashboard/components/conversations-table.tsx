"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Search } from "lucide-react";

import type { DashboardConversationRow } from "@/data/get-dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NativeSelect } from "@/components/ui/native-select";
import { formatDatePtBr } from "@/lib/formatters";
import { getStageLabel } from "../../chats/components/chats-view.helpers";

type ConversationsTableProps = {
  rows: DashboardConversationRow[];
  lastDataUpdate: string | null;
};

export default function ConversationsTable({
  rows,
  lastDataUpdate,
}: ConversationsTableProps) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();

  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [leadFilter, setLeadFilter] = useState("all");

  const stages = useMemo(() => {
    const options = new Set<string>();
    rows.forEach((row) => {
      if (row.stage && row.stage !== "-") {
        options.add(row.stage);
      }
    });
    return Array.from(options).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !term ||
        row.name.toLowerCase().includes(term) ||
        row.phone.toLowerCase().includes(term);

      const matchesStage = stageFilter === "all" || row.stage === stageFilter;
      const matchesStatus =
        statusFilter === "all" || row.status === statusFilter;
      const matchesLead = leadFilter === "all" || row.lead === leadFilter;

      return matchesSearch && matchesStage && matchesStatus && matchesLead;
    });
  }, [rows, search, stageFilter, statusFilter, leadFilter]);

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Atendimentos</CardTitle>
            <CardDescription>
              Tabela de contatos com estágio, tipo de atendimento e lead.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs sm:text-sm">
              Última atualização: {formatDatePtBr(lastDataUpdate, { preset: "full" })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => startRefresh(() => router.refresh())}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={isRefreshing ? "animate-spin" : ""}
                aria-hidden="true"
              />
              Atualizar
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 rounded-lg border p-4 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-8"
              placeholder="Buscar por telefone ou nome"
            />
          </div>

          <NativeSelect
            value={stageFilter}
            onChange={(event) => setStageFilter(event.target.value)}
          >
            <option value="all">Todos os estágios</option>
            {stages.map((stage) => (
              <option key={stage} value={stage}>
                {getStageLabel(stage)}
              </option>
            ))}
          </NativeSelect>

          <div className="grid gap-3 sm:grid-cols-2">
            <NativeSelect
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">Status (todos)</option>
              <option value="bot">Bot</option>
              <option value="humano">Humano</option>
            </NativeSelect>

            <NativeSelect
              value={leadFilter}
              onChange={(event) => setLeadFilter(event.target.value)}
            >
              <option value="all">Lead (todos)</option>
              <option value="S">Sim</option>
              <option value="N">Não</option>
            </NativeSelect>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Telefone</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Estágio</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Lead</TableHead>
              <TableHead>Última interação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.length > 0 ? (
              filteredRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.phone}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{getStageLabel(row.stage)}</TableCell>
                  <TableCell>
                    <Badge variant={row.status === "humano" ? "secondary" : "outline"}>
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.lead === "S" ? "default" : "outline"}>
                      {row.lead}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDatePtBr(row.lastInteraction, { preset: "full" })}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                  Nenhum registro encontrado com os filtros aplicados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
