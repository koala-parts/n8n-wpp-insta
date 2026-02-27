"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import bcrypt from "bcryptjs";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormControl, FormMessage } from "@/components/ui/form";
import { FormItem, FormLabel } from "@/components/ui/form";
import { Form, FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createBrowserSupabase } from "@/lib/supabase";

const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "Nome deve ter pelo menos 2 caracteres" }),

  email: z
    .string()
    .trim()
    .min(1, { message: "E-mail é obrigatório" })
    .email({ message: "E-mail inválido" }),

  password: z
    .string()
    .trim()
    .min(8, { message: "A senha deve ter pelo menos 8 caracteres" }),

  role: z.enum(["admin", "vendas", "atendimento"]),
});

const SignupForm = ({ onSuccess }: { onSuccess?: () => void }) => {
  const router = useRouter();

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "atendimento",
    },
  });

  const handleSubmit = async (values: z.infer<typeof signupSchema>) => {
    try {
      // 🔐 Hash da senha
      const passwordHash = await bcrypt.hash(values.password, 10);
      const supabase = createBrowserSupabase();
      const { error } = await supabase.from("users").insert({
        name: values.name,
        email: values.email,
        password_hash: passwordHash,
        role: values.role,
      });

      if (error) {
        if (error.code === "23505" || error.message.includes("duplicate")) {
          toast.error("Este e-mail já está cadastrado.");
        } else if (error.message.toLowerCase().includes("row-level security")) {
          toast.error("Cadastro bloqueado pela política do banco (RLS).");
        } else {
          const errorMessage = error?.message ?? "Erro desconhecido";
          toast.error(`Erro ao criar usuário: ${errorMessage}`);
        }
        console.error("Signup error:", error);
        return;
      }

      toast.success("Conta criada com sucesso!");
      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error("Signup unexpected error:", error);
      toast.error("Erro inesperado ao criar conta.");
    }
  };

  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <CardHeader>
            <CardTitle>Criar Conta</CardTitle>
            <CardDescription>
              Cadastre um novo usuário no sistema.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite seu nome" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite seu e-mail" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Digite sua senha"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cargo</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="w-full rounded-md border px-3 py-2 text-sm"
                    >
                      <option value="vendas">vendas</option>
                      <option value="atendimento">atendimento</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>

          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Criar Conta"
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
};

export default SignupForm;