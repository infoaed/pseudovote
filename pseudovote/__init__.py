from pathlib import Path
from importlib.util import find_spec
from datetime import datetime
from pytz import UTC

__version__ = "0.2.2"

LASTMODIFIED_UNIXTIME = 0

if "__path__" in globals():   
    LASTMODIFIED_UNIXTIME = Path(__path__[0] + "/service.py").stat().st_mtime
else:
    s = find_spec("pseudovote")
    if s:
        LASTMODIFIED_UNIXTIME = Path(s.origin[:-len("__init__.py")] + "/service.py").stat().st_mtime
    else:
        p = Path("pseudovote/service.py")
        if p.is_file():
            LASTMODIFIED_UNIXTIME = Path("pseudovote/service.py").stat().st_mtime

LASTMODIFIED = datetime.utcfromtimestamp(LASTMODIFIED_UNIXTIME).replace(microsecond=0, tzinfo=UTC)
LASTMODIFIED_DATE = datetime.utcfromtimestamp(LASTMODIFIED_UNIXTIME).replace(tzinfo=UTC).date()
