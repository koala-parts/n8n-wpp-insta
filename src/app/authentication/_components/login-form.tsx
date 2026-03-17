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
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createBrowserSupabase } from "@/lib/supabase"; // 👈 usar seu client

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: "E-mail é obrigatório" })
    .email({ message: "E-mail inválido" }),
  password: z
    .string()
    .trim()
    .min(1, { message: "Senha é obrigatória" }) 
});

const LoginForm = () => {
  const router = useRouter();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleSubmit = async (values: z.infer<typeof loginSchema>) => {
    try {
      const supabase = createBrowserSupabase();  
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", values.email)
        .single();

      if (error || !user) {
        toast.error("E-mail ou senha inválidos.");
        return;
      }

      const passwordMatch = await bcrypt.compare(
        values.password,
        user.password_hash
      );

      if (!passwordMatch) {
        toast.error("E-mail ou senha inválidos.");
        return;
      }

      const normalizedUser = {
        id: user.id,
        name: user.name?.trim() || "Usuário",
        role: user.role?.trim() || "atendimento",
        email: user.email?.trim() || values.email,
      };

      const sessionResponse = await fetch("/api/session/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(normalizedUser),
      });

      let responseText = await sessionResponse.text();
      let responseBody;
      try {
        responseBody = JSON.parse(responseText);
      } catch (e) {
        responseBody = null;
      }
      console.log("[LOGIN] Resposta do endpoint:", responseText);

      if (!sessionResponse.ok) {
        toast.error(responseBody?.error || "Falha ao criar sessão de acesso.");
        return;
      }

      try {
        localStorage.setItem("user", JSON.stringify(normalizedUser));
      } catch (storageError) {
        toast.error("Erro ao salvar usuário no localStorage: " + (storageError?.message || storageError));
        return;
      }

      toast.success("Login realizado com sucesso!");
      router.push("/dashboard");
    } catch (err) {
      toast.error("Erro inesperado ao fazer login: " + (err?.message || err));
      console.error("[LOGIN] Erro inesperado:", err);
    }
  };

  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>Faça login para continuar.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
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
                      placeholder="Digite sua senha"
                      type="password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>

          <CardFooter>
            <div className="w-full space-y-2">
              <Button
                type="submit"
                className="w-full"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Entrar"
                )}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
};

export default LoginForm;