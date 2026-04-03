import json
from urllib import request, error


class PushProvider:
    def send(self, *args, **kwargs):
        raise NotImplementedError


class ExpoPushProvider(PushProvider):
    endpoint = "https://exp.host/--/api/v2/push/send"

    def send(self, messages):
        """
        messages: lista de dicts no formato aceito pelo Expo Push API.
        Retorna a resposta JSON do servidor.
        """
        body = json.dumps(messages).encode("utf-8")
        req = request.Request(
            self.endpoint,
            data=body,
            headers={
                "Accept": "application/json",
                "Accept-Encoding": "gzip, deflate",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        try:
            with request.urlopen(req, timeout=20) as resp:
                payload = resp.read().decode("utf-8")
                return json.loads(payload)
        except error.HTTPError as exc:
            detail = exc.read().decode("utf-8")
            return {"data": [], "error": True, "status": exc.code, "detail": detail}
        except Exception as exc:
            return {"data": [], "error": True, "detail": str(exc)}
