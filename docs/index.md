# Introduction

Pseudovote is a voting machine implementing _the simplest process_ of casting pseudonymous votes on a public bulletin board. Voting takes place in three steps:

1. Deliver dedicated pseudonyms to a list of e-mails;
2. Collect the votes on a public bulletin board;
3. Count the result in a reasonably secret ballot.

Minimalist setting for [public bulletin board voting](https://s68aa858fd10b80a7.jimcontent.com/download/version/1485167010/module/4933929061/name/beuchat11.pdf) is reinforced by using common tools like e-mail and pseudonyms, but also immediate auditability of submitting your vote to a real time bulletin board, where you can literally _see_ other votes coming in.

Pseudovote moves in opposite direction to complicated voting systems with state of art cryptography, aiming instead to make the process [understandable for every participant](https://gafgaf.infoaed.ee/en/posts/pseudonymous-voting-in-wikimedia/#some-preliminary-analysis). Even the web service [in its current form](https://pseudovote.net/) is meant as a prototype for experimental and educational use, which should be replaced with plain text append only bulletin board for more demanding use cases.

## In real life

Preliminary forms of Pseudovote have been used at:

* [Wikimedia Estonia General Assembly](https://gafgaf.infoaed.ee/en/posts/pseudonymous-voting-in-wikimedia/) (2020)
* [Estonian Green Party General Assembly](https://www.facebook.com/rohelised/posts/325701606250799) (2022)

## Running your own

1\. Download the source code

```
git clone https://github.com/infoaed/pseudovote.git
cd pseudovote
pip install -r requirements.txt
```

2\. Set up the database

```
sudo apt install postgresql
sudo -u postgres psql < database.sql
```

3\. Run the bulletin board

```
uvicorn pseudovote.service:app
```

The web service should be running at [localhost:8000](http://localhost:8000).

If you prefer running a container, you get the same result by executing `docker compose up` after downloading the source code.
