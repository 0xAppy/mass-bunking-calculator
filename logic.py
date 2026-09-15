import math

def calculate_bunkable(attended, total, target_percent):
    # n = bunkable classes
    exact_n = (attended / (target_percent / 100)) - total
    n = math.floor(exact_n)
    return max(n, 0)  # can't bunk negative classes


def get_status(attended, total, target_percent):
    current_percent = (attended / total) * 100
    if current_percent < target_percent:
        return "red"
    elif current_percent < target_percent + 10:  # within 10% buffer 
        return "yellow"
    else:
        return "green"

    
#test 
print(calculate_bunkable(40, 50, 75))  # should print 3 
print(get_status(40, 50, 75)) 