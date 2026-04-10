import {
  PageContainer,
  PageContent,
  PageDescription,
  PageHeader,
  PageHeaderContent,
  PageTitle,
} from "@/components/ui/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CircleHelp,
  MessageSquare,
  Bot,
  Users,
  Bell,
  CheckCircle2,
  ArrowRightLeft,
  Sparkles,
} from "lucide-react";

const quickActions = [
  {
    icon: MessageSquare,
    title: "Meus Chats",
    description:
      "Aqui ficam as conversas sob sua responsabilidade. Você pode responder, transferir e finalizar quando necessário.",
  },
  {
    icon: Bot,
    title: "Chats do Bot",
    description:
      "Mostra conversas que ainda estão em automação. Use “Assumir conversa” para trazer para sua fila.",
  },
  {
    icon: Users,
    title: "Todas as Conversas",
    description:
      "Visão completa da operação. Você acompanha o status e pode solicitar transferência quando o chat estiver com outro atendente.",
  },
  {
    icon: Bell,
    title: "Notificações",
    description:
      "Central de transferências e solicitações. Aprove ou recuse pedidos com um clique.",
  },
];

export default function HelpPage() {
  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>Ajuda da Aplicação</PageTitle>
          <PageDescription>
            Guia rápido para usar o painel com mais confiança e menos dúvida no dia a dia.
          </PageDescription>
        </PageHeaderContent>
      </PageHeader>

      <PageContent>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CircleHelp className="size-5" />
              Primeiros passos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              1. Abra <strong>Meus Chats</strong> para atender sua fila atual.
            </p>
            <p>
              2. Se um cliente voltou após finalização, ele aparece em <strong>Chats do Bot</strong>.
            </p>
            <p>
              3. Em <strong>Todas as Conversas</strong>, acompanhe qualquer contato e solicite transferência quando necessário.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {quickActions.map((item) => (
            <Card key={item.title}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <item.icon className="size-5" />
                  {item.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="size-5" />
              Transferências e solicitações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <strong>Transferir</strong>: move o chat imediatamente para outra pessoa.
            </p>
            <p>
              <strong>Solicitar transferência</strong>: envia pedido para quem está com a conversa.
            </p>
            <p>
              A aprovação ou recusa chega em notificações para manter tudo rastreável.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-5" />
              Boas práticas rápidas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              Finalize apenas quando o atendimento estiver encerrado.
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              Use os estágios para facilitar filtros e acompanhamento da operação.
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              Revise notificações com frequência para evitar conversas paradas.
            </p>
          </CardContent>
        </Card>
      </PageContent>
    </PageContainer>
  );
}
