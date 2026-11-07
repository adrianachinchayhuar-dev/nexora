import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import "./index.css";
import { ContextoSesion, useAuth } from "@/lib/auth";
import type { Rol } from "@/lib/tipos";
import Aplicacion from "@/layout/Aplicacion";
import AplicacionProveedor from "@/layout/AplicacionProveedor";
import { Ingresar, Registro } from "@/pages/Acceso";
import Inicio from "@/pages/Inicio";
import Catalogo from "@/pages/Catalogo";
import Pedidos from "@/pages/Pedidos";
import NuevoPedido from "@/pages/NuevoPedido";
import Compras from "@/pages/Compras";
import CompraDetalle from "@/pages/CompraDetalle";
import Seguimiento from "@/pages/Seguimiento";
import Perfil from "@/pages/Perfil";
import IngresarProveedor from "@/pages/proveedor/Ingresar";
import PanelProveedor from "@/pages/proveedor/Panel";
import ComprasProveedor from "@/pages/proveedor/Compras";
import CompraProveedor from "@/pages/proveedor/CompraDetalle";
import IncidenciasProveedor from "@/pages/proveedor/Incidencias";
import DatosPrueba from "@/pages/proveedor/DatosPrueba";
import { Girando } from "@/components/comun";

/** Cada área (bodeguero o proveedor) tiene su propia sesión y su color. */
function Area({ rol }: { rol: Rol }) {
  useEffect(() => {
    document.documentElement.classList.toggle("tema-proveedor", rol === "PROVEEDOR");
    document.title = rol === "PROVEEDOR" ? "NEXORA · Proveedores" : "NEXORA";
  }, [rol]);
  return (
    <ContextoSesion key={rol} rol={rol}>
      <Outlet />
    </ContextoSesion>
  );
}

function Protegida({ acceso }: { acceso: string }) {
  const { cuenta, cargando } = useAuth();
  if (cargando)
    return (
      <div className="flex min-h-screen items-center justify-center text-primary">
        <Girando className="size-8" />
      </div>
    );
  return cuenta ? <Outlet /> : <Navigate to={acceso} replace />;
}

function SoloInvitado({ inicio }: { inicio: string }) {
  const { cuenta, cargando } = useAuth();
  if (cargando) return null;
  return cuenta ? <Navigate to={inicio} replace /> : <Outlet />;
}

const router = createBrowserRouter([
  {
    path: "/proveedor",
    element: <Area rol="PROVEEDOR" />,
    children: [
      { element: <SoloInvitado inicio="/proveedor" />, children: [{ path: "ingresar", element: <IngresarProveedor /> }] },
      {
        element: <Protegida acceso="/proveedor/ingresar" />,
        children: [
          {
            element: <AplicacionProveedor />,
            children: [
              { index: true, element: <PanelProveedor /> },
              { path: "compras", element: <ComprasProveedor /> },
              { path: "compras/:id", element: <CompraProveedor /> },
              { path: "incidencias", element: <IncidenciasProveedor /> },
              { path: "datos-de-prueba", element: <DatosPrueba /> },
              { path: "*", element: <Navigate to="/proveedor" replace /> },
            ],
          },
        ],
      },
    ],
  },
  {
    element: <Area rol="COMPRADOR" />,
    children: [
      {
        element: <SoloInvitado inicio="/" />,
        children: [
          { path: "/ingresar", element: <Ingresar /> },
          { path: "/registro", element: <Registro /> },
        ],
      },
      {
        element: <Protegida acceso="/ingresar" />,
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
              { path: "*", element: <Navigate to="/" replace /> },
            ],
          },
        ],
      },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
    <Toaster position="top-center" richColors closeButton />
  </StrictMode>,
);
