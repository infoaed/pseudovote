--
-- PostgreSQL create database script
--

CREATE DATABASE pseudovote ENCODING = 'UTF8';
ALTER DATABASE pseudovote OWNER TO postgres;
ALTER DATABASE pseudovote SET search_path TO '$user', pseudo;

\connect pseudovote;

CREATE SCHEMA pseudo;
ALTER SCHEMA pseudo OWNER TO postgres;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA pseudo;

--
-- Name: generate_uid(integer, regclass); Type: FUNCTION; Schema: pseudo; Owner: postgres
--

CREATE FUNCTION pseudo.generate_uid(size integer, tbl regclass) RETURNS text LANGUAGE plpgsql AS
$$
DECLARE
    characters TEXT := 'abcdefghijklmnopqrstuvwxyz';
    bytes BYTEA;
    l INT := length(characters);
    i INT;
    output TEXT := '';
    is_unique BOOL := FALSE;
BEGIN
    WHILE NOT is_unique LOOP
        bytes := pseudo.gen_random_bytes(size);
        i := 0;
        output := '';
        WHILE i < size LOOP
            output := output || substr(characters, get_byte(bytes, i) % l + 1, 1);
            i := i + 1;
        END LOOP;
    EXECUTE FORMAT('SELECT (NOT EXISTS (SELECT 1 FROM %s WHERE "token" = ''%s''))', tbl, output) INTO is_unique;
    END LOOP;
    RETURN output;
END;
$$;

ALTER FUNCTION pseudo.generate_uid(size integer, tbl regclass) OWNER TO postgres;

--
-- Name: get_bulletin_id(text); Type: FUNCTION; Schema: pseudo; Owner: postgres
--

CREATE FUNCTION pseudo.get_bulletin_id(token text) RETURNS integer LANGUAGE plpgsql AS
$$
DECLARE
    bulletin_id INT := 0;
BEGIN
    EXECUTE FORMAT('SELECT DISTINCT id FROM pseudo.bulletin WHERE "token" = ''%s''', token) INTO bulletin_id;
    IF bulletin_id IS NULL THEN
        EXECUTE FORMAT('SELECT id FROM pseudo.bulletin WHERE "name" = ''%s'' ORDER BY id DESC LIMIT 1', token) INTO bulletin_id;
    END IF;
    RETURN bulletin_id;
END
$$;

ALTER FUNCTION pseudo.get_bulletin_id(token text) OWNER TO postgres;

--
-- Name: new_bulletin_created(); Type: FUNCTION; Schema: pseudo; Owner: postgres
--

CREATE FUNCTION pseudo.new_bulletin_created() RETURNS trigger LANGUAGE plpgsql AS
$$
BEGIN
    EXECUTE FORMAT('CREATE SEQUENCE pseudo.bulletin_%s_votenum_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;', NEW.id);
    PERFORM pg_notify(
        'votes_and_bulletins',
        json_build_object(
            'operation', TG_OP,
            'record', json_build_object('token', NEW.token, 'start', NEW.start, 'finish', NEW.finish, 'limit_multi', NEW.limit_multi, 'limit_unlisted', NEW.limit_unlisted, 'limit_invalid', NEW.limit_invalid),
            'token', NEW.token,
            'type', 'bulletin_created'
        )::text
    );
    RETURN NEW;
END;
$$;

ALTER FUNCTION pseudo.new_bulletin_created() OWNER TO postgres;

--
-- Name: suggest_name(text, integer, regclass); Type: FUNCTION; Schema: pseudo; Owner: postgres
--

CREATE FUNCTION pseudo.suggest_name(name text, size integer, tbl regclass) RETURNS text
        LANGUAGE plpgsql
        AS $$
DECLARE
    characters TEXT := '0123456789';
    bytes BYTEA;
    l INT := length(characters);
    i INT;
    output TEXT := name;
    is_unique BOOL := FALSE;
BEGIN
    EXECUTE FORMAT('SELECT (NOT EXISTS (SELECT 1 FROM %s WHERE "name" = ''%s''))', tbl, output) INTO is_unique;
    WHILE NOT is_unique LOOP
        bytes := gen_random_bytes(size);
        i := 0;
        output := '';
        WHILE i < size LOOP
            output := output || substr(characters, get_byte(bytes, i) % l + 1, 1);
            i := i + 1;
        END LOOP;
        IF strpos(name, '-') = 0 THEN
            output := name || output;
        ELSE
            output := name || '-' || output;
        END IF;
        EXECUTE FORMAT('SELECT (NOT EXISTS (SELECT 1 FROM %s WHERE "name" = ''%s''))', tbl, output) INTO is_unique;
    END LOOP;
    RETURN output;
END;
$$;

ALTER FUNCTION pseudo.suggest_name(name text, size integer, tbl regclass) OWNER TO postgres;

--
-- Name: vote_before_added_to_bulletin(); Type: FUNCTION; Schema: pseudo; Owner: postgres
--

CREATE FUNCTION pseudo.vote_before_add_to_bulletin() RETURNS trigger LANGUAGE plpgsql AS
$$
BEGIN
    NEW.number := nextval(FORMAT('pseudo.bulletin_%s_votenum_seq', NEW.bulletin_id)::regclass);
    RETURN NEW;
END;
$$;

ALTER FUNCTION pseudo.vote_before_add_to_bulletin() OWNER TO postgres;

--
-- Name: vote_added_to_bulletin(); Type: FUNCTION; Schema: pseudo; Owner: postgres
--

CREATE FUNCTION pseudo.vote_added_to_bulletin() RETURNS trigger LANGUAGE plpgsql AS
$$
DECLARE
    title VARCHAR(1024);
    encrypt_until_end BOOL;
    vote_finish TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT token, ballot_type IS NOT NULL, finish into title, encrypt_until_end, vote_finish from pseudo.bulletin where id = NEW.bulletin_id;
    IF encrypt_until_end and NOW() < vote_finish THEN
        PERFORM pg_notify(
            'votes_and_bulletins',
            json_build_object(
                'operation', TG_OP,
                'record', json_build_object('pseudonym', NEW.pseudonym, 'content', NEW.content_hash, 'added', date_trunc('second', NEW.added), 'number', NEW.number),
                'token', title,
                'type', 'vote_added'
            )::text
        );
    ELSE
        PERFORM pg_notify(
            'votes_and_bulletins',
            json_build_object(
                'operation', TG_OP,
                'record', json_build_object('pseudonym', NEW.pseudonym, 'content', NEW.content, 'added', NEW.added, 'number', NEW.number),
                'token', title,
                'type', 'vote_added'
            )::text
        );
    END IF;
    RETURN NEW;
END;
$$;

ALTER FUNCTION pseudo.vote_added_to_bulletin() OWNER TO postgres;

--
-- Name: vote; Type: TABLE; Schema: pseudo; Owner: postgres
--

CREATE SEQUENCE pseudo.vote_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE pseudo.vote (
    id integer DEFAULT nextval('pseudo.vote_id_seq'::regclass) NOT NULL,
    bulletin_id integer,
    number integer GENERATED ALWAYS AS IDENTITY,
    pseudonym character varying(1024),
    content character varying(4096),
    added timestamp with time zone DEFAULT now() NOT NULL,
    content_hash character varying(1024)
);

ALTER TABLE pseudo.vote OWNER TO postgres;
ALTER TABLE pseudo.vote_id_seq OWNER TO postgres;
ALTER SEQUENCE pseudo.vote_id_seq OWNED BY pseudo.vote.id;

--
-- Name: bulletin; Type: TABLE; Schema: pseudo; Owner: postgres
--

CREATE SEQUENCE pseudo.bulletin_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE pseudo.bulletin (
    id integer DEFAULT nextval('pseudo.bulletin_id_seq'::regclass) NOT NULL,
    token character varying(1024) DEFAULT pseudo.generate_uid(12, 'pseudo.bulletin'::regclass) NOT NULL,
    name character varying(1024),
    title character varying(1024),
    created timestamp with time zone DEFAULT now() NOT NULL,
    start timestamp with time zone DEFAULT (now() + '00:03:00'::interval),
    finish timestamp with time zone DEFAULT (now() + '00:08:00'::interval),
    choices text,
    reject_multi boolean NOT NULL DEFAULT false,
    personal_ballot boolean NOT NULL DEFAULT false,
    limit_choices boolean NOT NULL DEFAULT false,
    reject_invalid boolean NOT NULL DEFAULT false,
    reject_unlisted boolean NOT NULL DEFAULT false,
    mute_unlisted boolean NOT NULL DEFAULT false,
    block_unlisted boolean NOT NULL DEFAULT false,
    limit_invalid boolean NOT NULL DEFAULT false,
    limit_unlisted boolean NOT NULL DEFAULT false,
    limit_multi boolean NOT NULL DEFAULT false,
    encrypt_ballots boolean NOT NULL DEFAULT false,
    ballot_type character varying(64),
    voterhash_type character varying(64),
    pubkey_id character varying(64),
    voter_count integer,
    key character varying(8192),
    public_key character varying(8192),
    full_voterlist text
);

ALTER TABLE pseudo.bulletin OWNER TO postgres;
ALTER TABLE pseudo.bulletin_id_seq OWNER TO postgres;
ALTER SEQUENCE pseudo.bulletin_id_seq OWNED BY pseudo.bulletin.id;

--
-- Name: voterlist; Type: TABLE; Schema: pseudo; Owner: postgres
--

CREATE SEQUENCE pseudo.voterlist_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE pseudo.voterlist (
    id integer DEFAULT nextval('pseudo.voterlist_id_seq'::regclass) NOT NULL,
    bulletin_id integer NOT NULL,
    pseudonym character varying(1024),
    code character varying(1024),
    cryptonym character varying(1024),
    hash character varying(1024)
);

ALTER TABLE pseudo.voterlist OWNER TO postgres;
ALTER TABLE pseudo.voterlist_id_seq OWNER TO postgres;

ALTER TABLE ONLY pseudo.vote ADD CONSTRAINT vote_pkey PRIMARY KEY (id);
ALTER TABLE ONLY pseudo.voterlist ADD CONSTRAINT voterlist_pkey PRIMARY KEY (id);
ALTER TABLE ONLY pseudo.bulletin ADD CONSTRAINT bulletin_pkey PRIMARY KEY (id);
ALTER TABLE ONLY pseudo.bulletin ADD CONSTRAINT unique_name UNIQUE (token);

ALTER TABLE ONLY pseudo.vote ADD CONSTRAINT fk_bulletin FOREIGN KEY (bulletin_id) REFERENCES pseudo.bulletin(id);
ALTER TABLE ONLY pseudo.voterlist ADD CONSTRAINT voterlist_bulletin_id_fkey FOREIGN KEY (bulletin_id) REFERENCES pseudo.bulletin(id);

CREATE TRIGGER bulletin_created AFTER INSERT ON pseudo.bulletin FOR EACH ROW EXECUTE PROCEDURE pseudo.new_bulletin_created();
CREATE TRIGGER vote_before_add BEFORE INSERT ON pseudo.vote FOR EACH ROW EXECUTE PROCEDURE pseudo.vote_before_add_to_bulletin();
CREATE TRIGGER vote_added AFTER INSERT ON pseudo.vote FOR EACH ROW EXECUTE PROCEDURE pseudo.vote_added_to_bulletin();

CREATE USER pseudo;
ALTER USER pseudo WITH PASSWORD 'default';
GRANT CONNECT ON DATABASE pseudovote TO pseudo;

GRANT USAGE,CREATE ON SCHEMA pseudo TO pseudo;
GRANT SELECT,INSERT ON TABLE pseudo.vote TO pseudo;
GRANT SELECT,INSERT ON TABLE pseudo.voterlist TO pseudo;
GRANT SELECT,INSERT,UPDATE ON TABLE pseudo.bulletin TO pseudo;
GRANT SELECT,USAGE ON SEQUENCE pseudo.bulletin_id_seq TO pseudo;
GRANT SELECT,USAGE ON SEQUENCE pseudo.vote_id_seq TO pseudo;
GRANT SELECT,USAGE ON SEQUENCE pseudo.voterlist_id_seq TO pseudo;
