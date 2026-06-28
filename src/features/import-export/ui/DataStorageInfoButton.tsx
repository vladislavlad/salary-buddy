import { Info } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";

/**
 * Кнопка в хедере с пояснением, что приложение не хранит данные на сервере –
 * всё лежит только в локальном браузере пользователя.
 */
export function DataStorageInfoButton() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="О хранении данных"
          title="О хранении данных"
        >
          <Info className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Где хранятся данные</DialogTitle>
          <DialogDescription>
            Приложение работает полностью в браузере и не отправляет ваши данные
            на сервер.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            Все данные – оклад, премии, отпуска, больничные и настройки –
            хранятся только локально в этом браузере (localStorage).
          </p>
          <p>
            Если очистить данные браузера, открыть приложение в другом браузере
            или на другом устройстве – введённое не сохранится.
          </p>
          <p>
            Чтобы перенести или сохранить данные, используйте «Сохранить» в
            разделе «Выгрузка данных», а затем «Загрузить» при необходимости.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
