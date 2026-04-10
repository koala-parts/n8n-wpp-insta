import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/person";

type ContactAvatarProps = {
  name: string;
  photo?: string | null;
  className?: string;
};

export function ContactAvatar({ name, photo, className }: ContactAvatarProps) {
  return (
    <Avatar className={className}>
      <AvatarImage src={photo ?? undefined} alt={name} />
      <AvatarFallback>{getInitials(name)}</AvatarFallback>
    </Avatar>
  );
}
