import sys, uvicorn

def main(args=None):
    uvicorn.run("pseudovote.service:app", forwarded_allow_ips="*", log_level="info")

if __name__ == "__main__":
    sys.exit(main())
