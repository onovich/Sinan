import * as Comlink from "comlink";
import { createWorkerTaskHost } from "./comlink-worker-task-host";

Comlink.expose(createWorkerTaskHost());
