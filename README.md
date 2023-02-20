# Pseudovote

Voting machine providing simplest yet auditable polls/elections on the Internet. A three step process:

* Deliver random pseudonyms to a list of e-mails;
* Collect the votes on a public bulletin board;
* Count the result in a reasonably secret ballot.

Ideally pseudonyms should be delivered by a separate service, but for most practical cases and educational use you can trust web service at [Pseudovote.net](https://pseudovote.net/) to deliver them for you.

The web service discloses its full source code according to requirement of [AGPL  license](LICENSE).

## Running your own

1. Download the source code

```
git clone https://github.com/infoaed/pseudovote.git
cd pseudovote
pip install -r requirements.txt
```

2. Set up the database

```
sudo apt install postgres
sudo -u postgres psql < database.sql
```

3. Run the bulletin board

```
uvicorn pseudovote:service.app
```

The web service should be running at [localhost:8000](http://localhost:8000).

## Auditable polls on Internet

It gets complicated very quickly. Usually you just trust a service to run a poll for you, but not so much for citizens' assemblies, shareholder meetings etc. At a certain point people feel they need some proofs and transparency. Like we have using paper ballots.

You will be told that there is proof, but you have to know mathematics. After researching into options you end up choosing even more expensive service to trust, but still don't have much of a proof. For most of us the cryptography behind state of art voting systems is too complicated to understand.

Pseudovote helps to take the opposite route, building on e-mail and pseudonyms -- well known tools already from the early days of Internet. Collecting pseudonymous ballots on public bulletin board is an addition you might still need to get used to. But it is probably closest you get to collecting pieces of paper in a transparent ballot box.

Oldest and most experienced online communities tend to conduct their elections in a similar manner.

There is [a write-up](https://gafgaf.infoaed.ee/en/posts/pseudonymous-voting-in-wikimedia/) explaining the historical context of the project and [slides from a 2020 presentation](https://p6drad-teel.net/~p6der/pseudovote-2020.pdf) for a local computer security crowd.

## In real life

Preliminary forms of Pseudovote have been used at:

* Wikimedia Estonia [General Assembly in 2020](https://wikimedia.ee/haaleta-nagu-vikipedist/)
* Estonian Green Party [General Assembly in 2022](https://www.facebook.com/rohelised/posts/325701606250799)

Initial experiments have resulted in an educational yet fully functional web service demonstrating the process conceived at [Uduloor](https://github.com/infoaed/uduloor).
