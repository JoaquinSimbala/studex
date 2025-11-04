import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { ExploreComponent } from './pages/explore/explore';
import { SellerVerificationComponent } from './pages/seller-verification/seller-verification';
import { UploadProjectComponent } from './pages/upload-project/upload-project';
import { SellerProjectsComponent } from './pages/seller-projects/seller-projects';
import { ProjectDetailComponent } from './pages/project-detail/project-detail';
import { ProfileComponent } from './pages/profile/profile.component';
import { FavoritesComponent } from './pages/favorites/favorites.component';
import { CartComponent } from './pages/cart/cart.component';
import { NotificationsComponent } from './pages/notifications/notifications';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'explorar', component: ExploreComponent },
  { path: 'login', component: Login },
  { path: 'perfil', component: ProfileComponent },
  { path: 'favoritos', component: FavoritesComponent },
  { path: 'carrito', component: CartComponent },
  { path: 'notifications', component: NotificationsComponent },
  { path: 'vender', component: SellerVerificationComponent },
  { path: 'vendedor/subir-proyecto', component: UploadProjectComponent },
  { path: 'vendedor/mis-proyectos', component: SellerProjectsComponent },
  { path: 'vendedor/proyecto/:id', component: ProjectDetailComponent },
  { path: 'proyecto/:id', component: ProjectDetailComponent }, // Nueva ruta pública
  { path: '**', redirectTo: '' }
];
