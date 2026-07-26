from types import SimpleNamespace
from unittest.mock import MagicMock

from app.integrations.square.customers import SquareCustomerGateway


def _customer(id_, phone_number=None):
    return SimpleNamespace(id=id_, phone_number=phone_number)


def _search_response(customers):
    return SimpleNamespace(customers=customers)


def _client_returning(*, by_phone=None, by_email=None):
    """Fakes Square's customers.search: routes on the query filter field so a test can control
    what each lookup finds, without caring about the real Square SDK's request shape."""
    client = MagicMock()

    def search(query, limit):
        field = next(iter(query["filter"]))
        if field == "phone_number":
            return _search_response([by_phone] if by_phone else [])
        if field == "email_address":
            return _search_response([by_email] if by_email else [])
        raise AssertionError(f"unexpected search field: {field}")

    client.customers.search.side_effect = search
    return client


def test_phone_match_wins_without_checking_email():
    client = _client_returning(by_phone=_customer("CUST_PHONE"))
    gateway = SquareCustomerGateway(client)

    result = gateway.find_existing(phone_number="6195550100", email_address="jade@example.com")

    assert result == "CUST_PHONE"
    client.customers.search.assert_called_once()


def test_email_match_used_when_its_phone_agrees():
    client = _client_returning(by_email=_customer("CUST_EMAIL", phone_number="+16195550100"))
    gateway = SquareCustomerGateway(client)

    result = gateway.find_existing(phone_number="6195550100", email_address="jade@example.com")

    assert result == "CUST_EMAIL"


def test_email_match_used_when_it_has_no_phone_on_file():
    client = _client_returning(by_email=_customer("CUST_EMAIL", phone_number=None))
    gateway = SquareCustomerGateway(client)

    result = gateway.find_existing(phone_number="6195550100", email_address="jade@example.com")

    assert result == "CUST_EMAIL"


def test_email_match_rejected_when_its_phone_conflicts():
    # Regression test: a stale/unrelated Square profile that happens to share an email (e.g. a
    # customer's old record from before a phone-number change) must never be silently reused just
    # because email matched — that misattributes new leads/bookings to the wrong customer id.
    client = _client_returning(by_email=_customer("CUST_STALE", phone_number="+14245550199"))
    gateway = SquareCustomerGateway(client)

    result = gateway.find_existing(phone_number="6195550100", email_address="jade@example.com")

    assert result is None


def test_find_or_create_makes_a_fresh_customer_when_email_match_conflicts():
    client = _client_returning(by_email=_customer("CUST_STALE", phone_number="+14245550199"))
    client.customers.create.return_value = SimpleNamespace(customer=SimpleNamespace(id="CUST_NEW"))
    gateway = SquareCustomerGateway(client)

    result = gateway.find_or_create(
        given_name="Jade", family_name="Clien", email_address="jade@example.com", phone_number="6195550100",
    )

    assert result == "CUST_NEW"
    client.customers.create.assert_called_once()


def test_find_or_create_reuses_phone_match_without_creating():
    client = _client_returning(by_phone=_customer("CUST_PHONE"))
    gateway = SquareCustomerGateway(client)

    result = gateway.find_or_create(
        given_name="Jade", family_name="Clien", email_address="jade@example.com", phone_number="6195550100",
    )

    assert result == "CUST_PHONE"
    client.customers.create.assert_not_called()
