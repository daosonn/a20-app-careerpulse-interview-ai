from pydantic import BaseModel
from typing import Optional

class OnboardReq(BaseModel):
    uid: str
    email: str
    name: str
    avatar: Optional[str] = None
    cv_text: str
