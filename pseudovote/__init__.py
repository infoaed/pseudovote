from os import path
from datetime import datetime
from pytz import UTC

__version__ = "0.2.1"

if "__path__" in globals():
    LASTMODIFIED_UNIXTIME = path.getmtime(__path__[0] + "/service.py")
else:
    LASTMODIFIED_UNIXTIME = path.getmtime("pseudovote/service.py")
    
LASTMODIFIED = datetime.utcfromtimestamp(LASTMODIFIED_UNIXTIME).replace(microsecond=0, tzinfo=UTC)
LASTMODIFIED_DATE = datetime.utcfromtimestamp(LASTMODIFIED_UNIXTIME).replace(tzinfo=UTC).date()
