import { useDispatch, useSelector } from "react-redux";

// RootState и AppDispatch объявлены глобально в слое app (src/app/store),
// чтобы нижние слои FSD не импортировали app.
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
