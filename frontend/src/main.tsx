import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import "./index.css";
import { ProveedorAuth, useAuth } from "@/lib/auth";
import Aplicacion from "@/layout/Aplicacion";
import { Ingresar, Registro } from "@/pages/Acceso";
import Inicio from "@/pages/Inicio";
import Catalogo from "@/pages/Catalogo";
import Pedidos from "@/pages/Pedidos";
import NuevoPedido from "@/pages/NuevoPedido";
import Compras from "@/pages/Compras";
import CompraDetalle from "@/pages/CompraDetalle";
import Seguimiento from "@/pages/Seguimiento";
import Perfil from "@/pages/Perfil";
import Demo from "@/pages/Demo";
import { Girando } from "@/components/comun";

function Protegida() {
  const { cuenta, cargando } = useAuth();
  if (cargando)
    return (
      <div className="flex min-h-screen items-center justify-center text-primary">
        <Girando className="size-8" />
      </div>
    );
  return cuenta ? <Outlet /> : <Navigate to="/ingresar" replace />;
}

function SoloInvitado() {
  const { cuenta, cargando } = useAuth();
  if (cargando) return null;
  return cuenta ? <Navigate to="/" replace /> : <Outlet />;
}

const router = createBrowserRouter([
  {
    element: <SoloInvitado />,
    children: [
      { path: "/ingresar", element: <Ingresar /> },
      { path: "/registro", element: <Registro /> },
    ],
  },
  {
    element: <Protegida />,
    children: [
      {
        element: <Aplicacion />,
        children: [
          { path: "/", element: <Inicio /> },
          { path: "/catalogo", element: <Catalogo /> },
          { path: "/pedidos", element: <Pedidos /> },
          { path: "/pedidos/nuevo", element: <NuevoPedido /> },
          { path: "/compras", element: <Compras /> },
          { path: "/compras/:id", element: <CompraDetalle /> },
          { path: "/seguimiento", element: <Seguimiento /> },
          { path: "/perfil", element: <Perfil /> },
          { path: "/demo", element: <Demo /> },
          { path: "*", element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ProveedorAuth>
      <RouterProvider router={router} />
      <Toaster position="top-center" richColors closeButton />
    </ProveedorAuth>
  </StrictMode>,
);
