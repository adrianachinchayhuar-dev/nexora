-- El proveedor ingresa con su propia cuenta (perfil PROVEEDOR) y solo ve sus compras conjuntas.
ALTER TABLE proveedor ADD COLUMN usuario_id BIGINT UNIQUE REFERENCES usuario(id) ON DELETE SET NULL;
