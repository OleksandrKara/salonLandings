"""Small formatting helpers shared across booking services — extracted out of BookingService so
PmuBookingService can reuse the exact same Square-address formatting rather than a second copy."""


def format_square_address(address) -> str:
    if address is None:
        return ""
    return ", ".join(
        part
        for part in [
            address.address_line1,
            address.locality,
            " ".join(filter(None, [address.administrative_district_level1, address.postal_code])),
        ]
        if part
    )
