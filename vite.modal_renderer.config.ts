import type { ConfigEnv, UserConfig } from "vite"
import { defineConfig } from "vite"
import { pluginExposeRenderer } from "./vite.base.config"
import path from "path"

// https://vitejs.dev/config
export default defineConfig((env) => {
  const forgeEnv = env as ConfigEnv<"renderer">
  const { root, mode, forgeConfigSelf } = forgeEnv
  const name = forgeConfigSelf.name ?? ""

  return {
    root: path.join(__dirname, "src", "modal-page"),
    mode,
    base: "./",
    build: {
      outDir: path.join(__dirname, `.vite/renderer/${name}`),
    },
    plugins: [pluginExposeRenderer(name)],
    resolve: {
      preserveSymlinks: true,
    },
    clearScreen: false,
  } as UserConfig
})
