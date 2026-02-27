import {
  PageContainer,
  PageContent,
  PageDescription,
  PageHeader,
  PageHeaderContent,
  PageTitle,
} from "@/components/ui/page-container";

import StatsCards from "./components/stats-cards";
import getDashboardData from "@/data/get-dashboard";
import ConversationsTable from "./components/conversations-table";

export const dynamic = "force-dynamic";

const DashboardPage = async () => {
  const {
    totalContacts,
    humanAttendance,
    totalLeads,
    newLeads,
    supportRequests,
    conversationRows,
    lastDataUpdate,
  } = await getDashboardData();

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>Dashboard WhatsApp</PageTitle>
          <PageDescription>
            Visão geral dos atendimentos e leads no WhatsApp
          </PageDescription>
        </PageHeaderContent>
      </PageHeader>

      <PageContent>
        <StatsCards
          totalContacts={totalContacts ?? 0}
          humanAttendance={humanAttendance ?? 0}
          totalLeads={totalLeads ?? 0}
          newLeads={newLeads ?? 0}
          supportRequests={supportRequests ?? 0}
        />

        <ConversationsTable
          rows={conversationRows}
          lastDataUpdate={lastDataUpdate}
        />
      </PageContent>
    </PageContainer>
  );
};

export default DashboardPage;
