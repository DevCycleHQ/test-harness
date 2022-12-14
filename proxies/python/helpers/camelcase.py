from re import sub


def camel_case(s):
    s = sub(r"(_|-)+", " ", s).title().replace(" ", "")
    return ''.join([s[0].lower(), s[1:]])


def camel_case_dict(source):
    return {camel_case(key): val for key, val in source.items()}