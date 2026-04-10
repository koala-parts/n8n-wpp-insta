import {
  UsersIcon,
  UserCheckIcon,
  UserPlusIcon,
  HeadsetIcon,
  MessageSquareIcon,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface StatsCardsProps {
  totalContacts: number;
  humanAttendance: number;
  totalLeads: number;
  newLeads: number;
  supportRequests: number;
}

const StatsCards = ({
  totalContacts,
  humanAttendance,
  totalLeads,
  newLeads,
  supportRequests,
}: StatsCardsProps) => {
  const stats = [
    {
      title: "Total Contatos",
      value: totalContacts.toString(),
      icon: UsersIcon,
    },
    {
      title: "Atend. Humano",
      value: humanAttendance.toString(),
      icon: HeadsetIcon,
    },
    {
      title: "Total Leads",
      value: totalLeads.toString(),
      icon: UserCheckIcon,
    },
    {
      title: "Leads Novos",
      value: newLeads.toString(),
      icon: UserPlusIcon,
    },
    {
      title: "Suporte / Pedidos",
      value: supportRequests.toString(),
      icon: MessageSquareIcon,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <Card key={stat.title} className="gap-2">
            <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
              <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
                <Icon className="text-primary h-4 w-4" />
              </div>
              <CardTitle className="text-muted-foreground text-sm font-medium">
                {stat.title}
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default StatsCards;
