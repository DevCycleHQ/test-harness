from re import sub


def camel_case(s):
    s = sub(r"(_|-)+", " ", s).title().replace(" ", "")
    return ''.join([s[0].lower(), s[1:]])

def snake_case(s):
    return sub(r'(?<!^)(?=[A-Z])', '_', s).lower()


def camel_case_dict(source):
    return {camel_case(key): val for key, val in source.items()}

def snake_case_dict(source):
    return {snake_case(key): val for key, val in source.items()}