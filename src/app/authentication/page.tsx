"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoginForm from "./_components/login-form";
import SignupForm from "./_components/sign-up-form";

export type AuthTabValue = "login" | "register";

const AuthenticationPage = () => {
    const [activeTab, setActiveTab] = useState<AuthTabValue>("login");

    return (
         <div className="flex h-screen w-screen items-center justify-center">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AuthTabValue)} className="w-[400px]">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="register">Criar conta</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <LoginForm />
        </TabsContent>
        <TabsContent value="register">
          <SignupForm onSuccess={() => setActiveTab("login")} />
        </TabsContent>
      </Tabs>
    </div>
    )
}

export default AuthenticationPage;